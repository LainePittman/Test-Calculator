// Timer tool: set a length on the keypad or with a preset, then count down with an
// alarm. The end time is saved, so a running timer survives closing the app.
(window.Tools = window.Tools || []).push((() => {
  const STORE_KEY = 'timer';
  const saved = Store.get(STORE_KEY, {});
  const timer = new Timer(saved.timer || {});
  let entry = typeof saved.entry === 'string' ? saved.entry : ''; // digits typed, e.g. "500"
  let lastEntry = typeof saved.lastEntry === 'string' ? saved.lastEntry : '';
  let el = {};
  let interval = null;
  let alarm = null;
  let audio = null;

  const save = () => Store.set(STORE_KEY, { timer, entry, lastEntry });
  const pad = n => String(n).padStart(2, '0');

  // ---- Sound: each theme defines its own alarm (see themes.js) ----
  function unlockAudio() {
    try {
      audio ??= new (window.AudioContext || window.webkitAudioContext)();
      audio.resume?.();
    } catch { audio = null; }
  }

  function beep() {
    if (!audio) return;
    const { wave, notes, gain: level } = Themes.resolve(document.documentElement.dataset.appTheme).sound;
    const t0 = audio.currentTime;
    const gap = notes.length > 2 ? 0.22 : 0.4; // chimes ring longer
    notes.forEach((freq, i) => {
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      osc.type = wave;
      osc.frequency.value = freq;
      const t = t0 + i * gap;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(level, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + gap * 0.8);
      osc.connect(gain).connect(audio.destination);
      osc.start(t);
      osc.stop(t + gap);
    });
  }

  function startAlarm() {
    if (alarm) return;
    let rings = 0;
    const ring = () => {
      beep();
      navigator.vibrate?.([200, 100, 200]);
      if (++rings >= 30) stopAlarmSound(); // about 45 seconds, then stay quiet
    };
    ring();
    alarm = setInterval(ring, 1500);
  }

  function stopAlarmSound() {
    clearInterval(alarm);
    alarm = null;
  }

  // ---- Rendering ----
  function renderEntry() {
    const { h, m, s } = Timer.entryParts(entry);
    const typed = entry.length; // digits count from the right
    const part = (value, unit, index) => {
      const set = typed > 4 - index * 2; // index 0 = h, 1 = m, 2 = s
      return `<span class="${set ? '' : 'unset'}">${pad(value)}</span><small>${unit}</small>`;
    };
    el.entry.innerHTML = [part(h, 'h', 0), part(m, 'm', 1), part(s, 's', 2)].join(' ');
    el.entry.setAttribute('aria-label', `Timer length ${h} hours ${m} minutes ${s} seconds`);
    el.start.disabled = Timer.entryToMs(entry) === 0;
  }

  function render() {
    const now = Date.now();
    const status = timer.status(now);
    const counting = status !== 'idle';
    el.setup.hidden = counting;
    el.run.hidden = !counting;

    if (!counting) {
      renderEntry();
      return;
    }

    const left = timer.remaining(now);
    el.left.textContent = Format.countdown(left);
    el.left.classList.toggle('long', left >= 3_600_000);
    el.meter.style.setProperty('--progress', timer.progress(now).toFixed(4));
    el.readout.classList.toggle('alarm', status === 'done');

    if (status === 'done') {
      el.status.textContent = "Time's up";
    } else if (status === 'paused') {
      el.status.textContent = 'Paused';
    } else {
      const end = new Date(timer.endsAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
      el.status.textContent = `Ends at ${end}`;
    }

    el.cancel.hidden = status === 'done';
    el.toggle.textContent = { running: 'Pause', paused: 'Resume', done: 'Stop' }[status];
    el.toggle.classList.toggle('danger', status === 'done');
  }

  // ---- Background check: runs whenever a timer is counting, on any tool ----
  function watch() {
    clearInterval(interval);
    interval = null;
    if (timer.status(Date.now()) !== 'running') return;
    interval = setInterval(() => {
      if (timer.status(Date.now()) === 'done') {
        clearInterval(interval);
        interval = null;
        window.App?.show('timer');
        startAlarm();
      }
      if (!el.run.hidden && el.run.offsetParent) render();
    }, 250);
  }

  function update() {
    save();
    render();
    watch();
  }

  // ---- Actions ----
  function type(digits) {
    entry = (entry + digits).replace(/^0+/, '').slice(0, 6);
    update();
  }

  function backspace() {
    entry = entry.slice(0, -1);
    update();
  }

  function start() {
    const ms = Timer.entryToMs(entry);
    if (!ms) return;
    unlockAudio(); // browsers only allow sound that starts from a tap
    lastEntry = entry;
    timer.start(ms, Date.now());
    update();
  }

  function toggle() {
    const now = Date.now();
    const status = timer.status(now);
    unlockAudio();
    if (status === 'running') timer.pause(now);
    else if (status === 'paused') timer.resume(now);
    else if (status === 'done') return finish();
    update();
  }

  function addMinute() {
    const now = Date.now();
    unlockAudio();
    if (timer.status(now) === 'done') {
      stopAlarmSound();
      timer.start(60_000, now); // snooze
    } else {
      timer.addTime(60_000, now);
    }
    update();
  }

  // Cancel or dismiss: back to the keypad with the last length ready to start again.
  function finish() {
    stopAlarmSound();
    timer.cancel();
    entry = lastEntry;
    update();
  }

  return {
    id: 'timer',
    title: 'Timer',

    init(root) {
      el = {
        setup: root.querySelector('#timer-setup'),
        run: root.querySelector('#timer-run'),
        entry: root.querySelector('#timer-entry'),
        start: root.querySelector('#timer-start'),
        readout: root.querySelector('#timer-readout'),
        status: root.querySelector('#timer-status'),
        left: root.querySelector('#timer-left'),
        meter: root.querySelector('#timer-meter'),
        cancel: root.querySelector('#timer-cancel'),
        toggle: root.querySelector('#timer-toggle'),
      };
      root.querySelector('.timer-keypad').addEventListener('click', e => {
        const btn = e.target.closest('button');
        if (!btn) return;
        if (btn.dataset.digit) type(btn.dataset.digit);
        else if (btn.dataset.action === 'backspace') backspace();
      });
      root.querySelector('#timer-presets').addEventListener('click', e => {
        const btn = e.target.closest('[data-preset]');
        if (!btn) return;
        entry = Timer.msToEntry(Number(btn.dataset.preset));
        update();
      });
      el.start.addEventListener('click', start);
      el.toggle.addEventListener('click', toggle);
      el.cancel.addEventListener('click', finish);
      root.querySelector('#timer-add').addEventListener('click', addMinute);
      watch();
    },

    show: render,

    needsAttention: () => timer.status(Date.now()) === 'done',

    // Setup: digits, Backspace, Enter. Counting: Space/Enter pause, Escape cancel.
    key(e) {
      if (e.target.closest('button') && (e.key === ' ' || e.key === 'Enter')) return false;
      const status = timer.status(Date.now());
      const k = e.key;
      if (status === 'idle') {
        if (/^\d$/.test(k)) type(k);
        else if (k === 'Backspace') backspace();
        else if (k === 'Enter') start();
        else return false;
      } else if (k === ' ' || k === 'Enter') {
        toggle();
      } else if (k === 'Escape') {
        finish();
      } else {
        return false;
      }
      return true;
    },
  };
})());

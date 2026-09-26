// Stopwatch tool: Start/Stop, Lap/Reset, lap list. State is saved so it keeps
// running while the app is closed.
(window.Tools = window.Tools || []).push((() => {
  const STORE_KEY = 'stopwatch';
  const sw = new Stopwatch(Store.get(STORE_KEY, {}));
  let timeEl, primaryBtn, secondaryBtn, lapsEl, currentRow;
  let frame = null;

  const save = () => Store.set(STORE_KEY, sw);

  function lapRow(label, ms, className = '') {
    const li = document.createElement('li');
    li.className = className;
    const name = document.createElement('span');
    name.textContent = label;
    const time = document.createElement('span');
    time.textContent = Format.stopwatch(ms);
    li.append(name, time);
    return li;
  }

  // Rebuilds the controls and lap list; called when state changes, not every frame.
  function render() {
    const now = Date.now();
    primaryBtn.textContent = sw.running ? 'Stop' : 'Start';
    primaryBtn.classList.toggle('danger', sw.running);
    secondaryBtn.textContent = sw.running || !sw.started ? 'Lap' : 'Reset';
    secondaryBtn.disabled = !sw.started;

    const { fastest, slowest } = sw.extremes();
    const rows = sw.laps().reverse().map(lap => lapRow(`Lap ${lap.number}`, lap.time,
      lap.number === fastest ? 'lap-fastest' : lap.number === slowest ? 'lap-slowest' : ''));
    currentRow = sw.started ? lapRow(`Lap ${sw.laps().length + 1}`, sw.currentLap(now)) : null;
    lapsEl.replaceChildren(...(currentRow ? [currentRow] : []), ...rows);
    tick();
  }

  // Updates just the running numbers.
  function tick() {
    const now = Date.now();
    const elapsed = sw.elapsed(now);
    timeEl.textContent = Format.stopwatch(elapsed);
    timeEl.classList.toggle('long', elapsed >= 3_600_000);
    if (currentRow) currentRow.lastChild.textContent = Format.stopwatch(sw.currentLap(now));
  }

  function loop() {
    tick();
    frame = sw.running ? requestAnimationFrame(loop) : null;
  }

  function startLoop() {
    if (!frame && sw.running && timeEl.offsetParent) frame = requestAnimationFrame(loop);
  }

  function stopLoop() {
    if (frame) cancelAnimationFrame(frame);
    frame = null;
  }

  function primary() {
    const now = Date.now();
    sw.running ? sw.stop(now) : sw.start(now);
    save();
    render();
    sw.running ? startLoop() : stopLoop();
  }

  function secondary() {
    sw.running ? sw.lap(Date.now()) : sw.reset();
    save();
    render();
  }

  return {
    id: 'stopwatch',
    title: 'Stopwatch',

    init(root) {
      timeEl = root.querySelector('#sw-time');
      primaryBtn = root.querySelector('#sw-primary');
      secondaryBtn = root.querySelector('#sw-secondary');
      lapsEl = root.querySelector('#sw-laps');
      primaryBtn.addEventListener('click', primary);
      secondaryBtn.addEventListener('click', secondary);
    },

    show() {
      render();
      startLoop();
    },

    hide: stopLoop,

    // Space = start/stop, L = lap, R = reset
    key(e) {
      if (e.target.closest('button') && (e.key === ' ' || e.key === 'Enter')) return false;
      const k = e.key.toLowerCase();
      if (k === ' ') primary();
      else if (k === 'l' && sw.running) secondary();
      else if (k === 'r' && !sw.running) secondary();
      else return false;
      return true;
    },
  };
})());

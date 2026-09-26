// Countdown timer state. Like the stopwatch, the current time is passed in and the
// end time is stored, so it stays accurate and survives closing the app.
class Timer {
  constructor(saved = {}) {
    this.duration = Number(saved.duration) || 0;   // total length, including any added time
    this.endsAt = Number(saved.endsAt) || 0;       // set while running
    this.pausedLeft = Number(saved.pausedLeft) || 0; // set while paused
    this.running = Boolean(saved.running) && this.endsAt > 0;
  }

  // 'idle' | 'running' | 'paused' | 'done'
  status(now) {
    if (this.running) return now >= this.endsAt ? 'done' : 'running';
    return this.pausedLeft > 0 ? 'paused' : 'idle';
  }

  remaining(now) {
    if (this.running) return Math.max(0, this.endsAt - now);
    return this.pausedLeft;
  }

  // Fraction of the time left, 1 → 0.
  progress(now) {
    return this.duration ? this.remaining(now) / this.duration : 0;
  }

  start(ms, now) {
    if (!(ms > 0)) return;
    this.duration = ms;
    this.endsAt = now + ms;
    this.pausedLeft = 0;
    this.running = true;
  }

  pause(now) {
    if (this.status(now) !== 'running') return;
    this.pausedLeft = this.remaining(now);
    this.running = false;
  }

  resume(now) {
    if (this.status(now) !== 'paused') return;
    this.endsAt = now + this.pausedLeft;
    this.pausedLeft = 0;
    this.running = true;
  }

  addTime(ms, now) {
    const status = this.status(now);
    if (status === 'running') this.endsAt += ms;
    else if (status === 'paused') this.pausedLeft += ms;
    else return;
    this.duration += ms;
  }

  cancel() {
    this.duration = this.endsAt = this.pausedLeft = 0;
    this.running = false;
  }

  toJSON() {
    return { duration: this.duration, endsAt: this.endsAt, pausedLeft: this.pausedLeft, running: this.running };
  }

  // Keypad entry fills h h m m s s from the right, like a microwave: "500" → 5m 00s.
  static entryParts(digits) {
    const d = digits.replace(/\D/g, '').slice(-6).padStart(6, '0');
    return { h: +d.slice(0, 2), m: +d.slice(2, 4), s: +d.slice(4, 6) };
  }

  // "90" means 90 seconds (1:30), as on most timers.
  static entryToMs(digits) {
    const { h, m, s } = Timer.entryParts(digits);
    return ((h * 60 + m) * 60 + s) * 1000;
  }

  // Inverse for presets: 300000 → "500"
  static msToEntry(ms) {
    const total = Math.round(ms / 1000);
    const h = Math.floor(total / 3600), m = Math.floor(total / 60) % 60, s = total % 60;
    const pad = n => String(n).padStart(2, '0');
    return String(Number(`${pad(h)}${pad(m)}${pad(s)}`) || '');
  }
}

if (typeof module !== 'undefined') module.exports = Timer;

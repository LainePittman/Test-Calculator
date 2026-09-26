// Stopwatch state. The current time is passed in rather than read, so the logic is
// testable and the state can be saved: a running stopwatch survives closing the app.
class Stopwatch {
  constructor(saved = {}) {
    this.running = Boolean(saved.running);
    this.startedAt = Number(saved.startedAt) || 0; // when the current run began
    this.banked = Number(saved.banked) || 0;       // time from earlier runs
    this.splits = Array.isArray(saved.splits) ? saved.splits.map(Number) : []; // total time at each lap
  }

  elapsed(now) {
    return this.banked + (this.running ? Math.max(0, now - this.startedAt) : 0);
  }

  start(now) {
    if (this.running) return;
    this.running = true;
    this.startedAt = now;
  }

  stop(now) {
    if (!this.running) return;
    this.banked = this.elapsed(now);
    this.running = false;
  }

  lap(now) {
    if (this.running) this.splits.push(this.elapsed(now));
  }

  reset() {
    if (this.running) return;
    this.banked = 0;
    this.splits = [];
  }

  get started() {
    return this.running || this.banked > 0;
  }

  // Completed laps, oldest first: [{ number, time, total }]
  laps() {
    return this.splits.map((total, i) => ({ number: i + 1, time: total - (this.splits[i - 1] || 0), total }));
  }

  // Time on the lap in progress.
  currentLap(now) {
    return this.elapsed(now) - (this.splits.at(-1) || 0);
  }

  // Lap numbers of the fastest and slowest completed laps (only once there are two to compare).
  extremes() {
    const laps = this.laps();
    if (laps.length < 2) return { fastest: null, slowest: null };
    const byTime = [...laps].sort((a, b) => a.time - b.time);
    return { fastest: byTime[0].number, slowest: byTime.at(-1).number };
  }

  toJSON() {
    return { running: this.running, startedAt: this.startedAt, banked: this.banked, splits: this.splits };
  }
}

if (typeof module !== 'undefined') module.exports = Stopwatch;

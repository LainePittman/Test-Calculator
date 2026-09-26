// Blackjack against a CPU dealer. Pure game state: no DOM, randomness injectable.
// Rules: 4-deck shoe, dealer draws to 16 and stands on all 17s, dealer checks for
// blackjack before you play. No betting: the game keeps a win/loss/push record.
const SUITS = ['♠', '♥', '♦', '♣'];
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const DECKS = 4;
const RESHUFFLE_BELOW = 52; // cards left in the shoe

// How each outcome counts on the record.
const RESULTS = {
  blackjack: 'win', win: 'win', 'dealer-bust': 'win',
  push: 'push',
  lose: 'lose', bust: 'lose', 'dealer-blackjack': 'lose',
};

class Blackjack {
  constructor(saved = {}, rng = Math.random) {
    this.rng = rng;
    const stats = saved.stats || {};
    this.stats = { won: stats.won | 0, lost: stats.lost | 0, pushed: stats.pushed | 0 };
    this.shoe = Array.isArray(saved.shoe) ? saved.shoe : [];
    this.player = Array.isArray(saved.player) ? saved.player : [];
    this.dealer = Array.isArray(saved.dealer) ? saved.dealer : [];
    this.phase = ['ready', 'player', 'done'].includes(saved.phase) ? saved.phase : 'ready';
    this.outcome = saved.outcome in RESULTS ? saved.outcome : null;
    if (this.phase === 'player' && this.player.length < 2) this.phase = 'ready';
    if (this.phase === 'done' && !this.outcome) this.phase = 'ready';
  }

  // { total, soft } where soft means an ace is still being counted as 11.
  static value(cards) {
    let total = 0, aces = 0;
    for (const c of cards) {
      if (c.rank === 'A') { aces++; total += 11; }
      else total += ['J', 'Q', 'K'].includes(c.rank) ? 10 : Number(c.rank);
    }
    while (total > 21 && aces) { total -= 10; aces--; }
    return { total, soft: aces > 0 };
  }

  static isBlackjack(cards) {
    return cards.length === 2 && Blackjack.value(cards).total === 21;
  }

  // 'win' | 'lose' | 'push' for an outcome
  static result(outcome) {
    return RESULTS[outcome] || null;
  }

  get result() {
    return Blackjack.result(this.outcome);
  }

  shuffle() {
    const cards = [];
    for (let d = 0; d < DECKS; d++) for (const suit of SUITS) for (const rank of RANKS) cards.push({ rank, suit });
    for (let i = cards.length - 1; i > 0; i--) { // Fisher–Yates
      const j = Math.floor(this.rng() * (i + 1));
      [cards[i], cards[j]] = [cards[j], cards[i]];
    }
    this.shoe = cards;
  }

  draw() {
    if (!this.shoe.length) this.shuffle();
    return this.shoe.pop();
  }

  deal() {
    if (this.phase === 'player') return false;
    if (this.shoe.length < RESHUFFLE_BELOW) this.shuffle();
    this.outcome = null;
    this.player = [];
    this.dealer = [];
    this.player.push(this.draw());
    this.dealer.push(this.draw());
    this.player.push(this.draw());
    this.dealer.push(this.draw()); // hole card
    this.phase = 'player';
    if (Blackjack.isBlackjack(this.player) || Blackjack.isBlackjack(this.dealer)) this.settle();
    return true;
  }

  hit() {
    if (this.phase !== 'player') return;
    this.player.push(this.draw());
    const { total } = Blackjack.value(this.player);
    if (total > 21) this.settle();
    else if (total === 21) this.stand();
  }

  stand() {
    if (this.phase !== 'player') return;
    while (Blackjack.value(this.dealer).total < 17) this.dealer.push(this.draw());
    this.settle();
  }

  // outcome: 'blackjack' | 'win' | 'dealer-bust' | 'push' | 'lose' | 'bust' | 'dealer-blackjack'
  settle() {
    const p = Blackjack.value(this.player).total;
    const d = Blackjack.value(this.dealer).total;
    const pBJ = Blackjack.isBlackjack(this.player);
    const dBJ = Blackjack.isBlackjack(this.dealer);
    let outcome;
    if (pBJ && dBJ) outcome = 'push';
    else if (pBJ) outcome = 'blackjack';
    else if (dBJ) outcome = 'dealer-blackjack';
    else if (p > 21) outcome = 'bust';
    else if (d > 21) outcome = 'dealer-bust';
    else outcome = p > d ? 'win' : p < d ? 'lose' : 'push';

    this.outcome = outcome;
    this.phase = 'done';
    const key = { win: 'won', lose: 'lost', push: 'pushed' }[this.result];
    this.stats[key]++;
  }

  resetStats() {
    this.stats = { won: 0, lost: 0, pushed: 0 };
  }

  toJSON() {
    const { stats, shoe, player, dealer, phase, outcome } = this;
    return { stats, shoe, player, dealer, phase, outcome };
  }
}

if (typeof module !== 'undefined') module.exports = Blackjack;

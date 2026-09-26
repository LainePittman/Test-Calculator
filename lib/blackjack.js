// Blackjack against a CPU dealer. Pure game state: no DOM, randomness injectable.
// Rules: 4-deck shoe, dealer draws to 16 and stands on all 17s, blackjack pays 3:2,
// double on the first two cards, dealer checks for blackjack before you play.
const SUITS = ['♠', '♥', '♦', '♣'];
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const DECKS = 4;
const RESHUFFLE_BELOW = 52; // cards left in the shoe
const STARTING_CHIPS = 1000;

class Blackjack {
  constructor(saved = {}, rng = Math.random) {
    this.rng = rng;
    this.bankroll = Number.isFinite(saved.bankroll) ? saved.bankroll : STARTING_CHIPS;
    this.stats = { won: 0, lost: 0, pushed: 0, ...saved.stats };
    this.shoe = Array.isArray(saved.shoe) ? saved.shoe : [];
    this.player = Array.isArray(saved.player) ? saved.player : [];
    this.dealer = Array.isArray(saved.dealer) ? saved.dealer : [];
    this.bet = Number(saved.bet) || 0;
    this.phase = ['betting', 'player', 'done'].includes(saved.phase) ? saved.phase : 'betting';
    this.outcome = saved.outcome || null; // see settle()
    this.payout = Number(saved.payout) || 0;
    this.doubled = Boolean(saved.doubled);
    if (this.phase === 'player' && !this.player.length) this.phase = 'betting';
  }

  static get startingChips() { return STARTING_CHIPS; }

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

  canDeal(bet) {
    return this.phase !== 'player' && Number.isInteger(bet) && bet > 0 && bet <= this.bankroll;
  }

  deal(bet) {
    if (!this.canDeal(bet)) return false;
    if (this.shoe.length < RESHUFFLE_BELOW) this.shuffle();
    this.bankroll -= bet;
    this.bet = bet;
    this.doubled = false;
    this.outcome = null;
    this.payout = 0;
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

  get canHit() { return this.phase === 'player'; }
  get canDouble() { return this.phase === 'player' && this.player.length === 2 && this.bankroll >= this.bet; }

  hit() {
    if (!this.canHit) return;
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

  double() {
    if (!this.canDouble) return;
    this.bankroll -= this.bet;
    this.bet *= 2;
    this.doubled = true;
    this.player.push(this.draw());
    if (Blackjack.value(this.player).total > 21) this.settle();
    else this.stand();
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

    const returned = { blackjack: this.bet * 2.5, win: this.bet * 2, 'dealer-bust': this.bet * 2, push: this.bet }[outcome] || 0;
    this.bankroll += returned;
    this.payout = returned - this.bet; // net result of the hand
    this.outcome = outcome;
    this.phase = 'done';
    if (this.payout > 0) this.stats.won++;
    else if (this.payout < 0) this.stats.lost++;
    else this.stats.pushed++;
  }

  get broke() {
    return this.phase !== 'player' && this.bankroll < 1;
  }

  newBankroll() {
    if (this.phase === 'player') return;
    this.bankroll = STARTING_CHIPS;
    this.stats = { won: 0, lost: 0, pushed: 0 };
    this.phase = 'betting';
    this.player = [];
    this.dealer = [];
    this.outcome = null;
  }

  toJSON() {
    const { bankroll, stats, shoe, player, dealer, bet, phase, outcome, payout, doubled } = this;
    return { bankroll, stats, shoe, player, dealer, bet, phase, outcome, payout, doubled };
  }
}

if (typeof module !== 'undefined') module.exports = Blackjack;

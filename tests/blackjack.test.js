const assert = require('assert');
const Blackjack = require('../lib/blackjack.js');

const card = rank => ({ rank, suit: '♠' });
const cards = ranks => ranks.split(' ').map(card);
const total = ranks => Blackjack.value(cards(ranks)).total;

// Stacks the shoe so cards come out in the given order (deal order: you, dealer, you, dealer),
// with filler underneath so it doesn't reshuffle.
function game(order, saved = {}) {
  const g = new Blackjack(saved);
  g.shoe = [...cards(Array(80).fill('5').join(' ')), ...cards(order).reverse()];
  return g;
}

module.exports = test => {
  test('blackjack: hand values', () => {
    assert.strictEqual(total('A K'), 21);
    assert.strictEqual(total('A A 9'), 21);
    assert.strictEqual(total('K Q 2'), 22);
    assert.strictEqual(total('A 6 10'), 17);
    assert.deepStrictEqual(Blackjack.value(cards('A 6')), { total: 17, soft: true });
    assert.deepStrictEqual(Blackjack.value(cards('A 6 10')), { total: 17, soft: false });
    assert.strictEqual(total('A A A A'), 14);
  });

  test('blackjack: a fresh shoe has 4 full decks', () => {
    const g = new Blackjack({}, () => 0.5);
    g.shuffle();
    assert.strictEqual(g.shoe.length, 208);
    assert.strictEqual(g.shoe.filter(c => c.rank === 'A' && c.suit === '♥').length, 4);
  });

  test('blackjack: dealing takes the bet', () => {
    const g = game('10 9 7 8');
    assert.ok(g.deal(100));
    assert.strictEqual(g.bankroll, 900);
    assert.strictEqual(g.phase, 'player');
    assert.deepStrictEqual(g.player.map(c => c.rank), ['10', '7']);
    assert.deepStrictEqual(g.dealer.map(c => c.rank), ['9', '8']);
  });

  test('blackjack: cannot bet more than you have, zero, or fractions', () => {
    const g = game('10 9 7 8', { bankroll: 50 });
    assert.ok(!g.deal(100));
    assert.ok(!g.deal(0));
    assert.ok(!g.deal(2.5));
    assert.strictEqual(g.bankroll, 50);
  });

  test('blackjack: natural blackjack pays 3:2 immediately', () => {
    const g = game('A 9 K 7');
    g.deal(100);
    assert.strictEqual(g.outcome, 'blackjack');
    assert.strictEqual(g.bankroll, 1150);
    assert.strictEqual(g.payout, 150);
  });

  test('blackjack: both blackjack is a push', () => {
    const g = game('A A K Q');
    g.deal(100);
    assert.strictEqual(g.outcome, 'push');
    assert.strictEqual(g.bankroll, 1000);
  });

  test('blackjack: dealer blackjack ends the hand before you play', () => {
    const g = game('10 A 9 K');
    g.deal(100);
    assert.strictEqual(g.outcome, 'dealer-blackjack');
    assert.strictEqual(g.bankroll, 900);
    g.hit();
    assert.strictEqual(g.player.length, 2, 'no hitting after the hand is over');
  });

  test('blackjack: busting loses and the dealer does not draw', () => {
    const g = game('10 6 6 10 K');
    g.deal(100);
    g.hit();
    assert.strictEqual(g.outcome, 'bust');
    assert.strictEqual(g.dealer.length, 2);
    assert.strictEqual(g.bankroll, 900);
  });

  test('blackjack: dealer draws to 17 and stands on soft 17', () => {
    const g = game('10 A 9 2 4'); // dealer A 2, draws 4 → soft 17, stands
    g.deal(100);
    g.stand();
    assert.deepStrictEqual(g.dealer.map(c => c.rank), ['A', '2', '4']);
    assert.strictEqual(g.outcome, 'win', '19 beats 17');
    assert.strictEqual(g.bankroll, 1100);
  });

  test('blackjack: dealer busting pays even money', () => {
    const g = game('10 10 8 6 K');
    g.deal(50);
    g.stand();
    assert.strictEqual(g.outcome, 'dealer-bust');
    assert.strictEqual(g.bankroll, 1050);
  });

  test('blackjack: higher dealer total loses, equal totals push', () => {
    const lose = game('10 10 7 9');
    lose.deal(10); lose.stand();
    assert.strictEqual(lose.outcome, 'lose');
    const push = game('10 10 8 8');
    push.deal(10); push.stand();
    assert.strictEqual(push.outcome, 'push');
    assert.strictEqual(push.bankroll, 1000);
  });

  test('blackjack: hitting to 21 stands automatically', () => {
    const g = game('5 10 6 8 K'); // you 5 6 + K = 21; dealer 18
    g.deal(10);
    g.hit();
    assert.strictEqual(g.phase, 'done');
    assert.strictEqual(g.outcome, 'win');
  });

  test('blackjack: double takes one card at twice the bet', () => {
    const g = game('6 10 5 7 10'); // you 11, double into 21; dealer 17
    g.deal(100);
    assert.ok(g.canDouble);
    g.double();
    assert.strictEqual(g.player.length, 3);
    assert.strictEqual(g.bet, 200);
    assert.strictEqual(g.outcome, 'win');
    assert.strictEqual(g.bankroll, 1200);
  });

  test('blackjack: no double after hitting or without enough chips', () => {
    const g = game('2 10 3 7 2');
    g.deal(100); g.hit();
    assert.ok(!g.canDouble);
    const poor = game('6 10 5 7 10', { bankroll: 150 });
    poor.deal(100);
    assert.ok(!poor.canDouble);
  });

  test('blackjack: reshuffles when the shoe runs low', () => {
    const g = new Blackjack({}, Math.random);
    g.shoe = cards('10 9 8 7 6');
    g.deal(10);
    assert.ok(g.shoe.length > 190);
  });

  test('blackjack: tracks wins, losses and pushes', () => {
    const g = game('A 9 K 7');
    g.deal(10);
    assert.deepStrictEqual(g.stats, { won: 1, lost: 0, pushed: 0 });
  });

  test('blackjack: out of chips, then a fresh 1,000', () => {
    const g = game('10 10 6 9 K', { bankroll: 100 });
    g.deal(100); g.hit();
    assert.ok(g.broke);
    g.newBankroll();
    assert.strictEqual(g.bankroll, 1000);
    assert.ok(!g.broke);
  });

  test('blackjack: a hand in progress survives a save and reload', () => {
    const g = game('10 9 7 8 2');
    g.deal(100);
    const restored = new Blackjack(JSON.parse(JSON.stringify(g)));
    assert.strictEqual(restored.phase, 'player');
    assert.strictEqual(restored.bankroll, 900);
    restored.hit();
    assert.strictEqual(Blackjack.value(restored.player).total, 19);
  });

  test('blackjack: money is conserved over many random hands', () => {
    let seed = 42;
    const rng = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const g = new Blackjack({}, rng);
    for (let i = 0; i < 2000; i++) {
      if (g.broke) g.newBankroll();
      const before = g.bankroll;
      const bet = Math.min(10, g.bankroll);
      g.deal(bet);
      while (g.phase === 'player') Blackjack.value(g.player).total < 17 ? g.hit() : g.stand();
      assert.strictEqual(g.bankroll, before + g.payout, `hand ${i}`);
      if (['win', 'lose', 'push', 'dealer-bust'].includes(g.outcome)) {
        assert.ok(Blackjack.value(g.dealer).total >= 17, `dealer stopped early on hand ${i}`);
      }
    }
  });
};

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
const record = g => [g.stats.won, g.stats.lost, g.stats.pushed].join('/');

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

  test('blackjack: dealing gives two cards each', () => {
    const g = game('10 9 7 8');
    assert.ok(g.deal());
    assert.strictEqual(g.phase, 'player');
    assert.deepStrictEqual(g.player.map(c => c.rank), ['10', '7']);
    assert.deepStrictEqual(g.dealer.map(c => c.rank), ['9', '8']);
    assert.ok(!g.deal(), 'cannot deal again mid-hand');
  });

  test('blackjack: natural blackjack wins immediately', () => {
    const g = game('A 9 K 7');
    g.deal();
    assert.strictEqual(g.outcome, 'blackjack');
    assert.strictEqual(g.result, 'win');
    assert.strictEqual(record(g), '1/0/0');
  });

  test('blackjack: both blackjack is a push', () => {
    const g = game('A A K Q');
    g.deal();
    assert.strictEqual(g.outcome, 'push');
    assert.strictEqual(record(g), '0/0/1');
  });

  test('blackjack: dealer blackjack ends the hand before you play', () => {
    const g = game('10 A 9 K');
    g.deal();
    assert.strictEqual(g.outcome, 'dealer-blackjack');
    assert.strictEqual(g.result, 'lose');
    g.hit();
    assert.strictEqual(g.player.length, 2, 'no hitting after the hand is over');
  });

  test('blackjack: busting loses and the dealer does not draw', () => {
    const g = game('10 6 6 10 K');
    g.deal();
    g.hit();
    assert.strictEqual(g.outcome, 'bust');
    assert.strictEqual(g.dealer.length, 2);
    assert.strictEqual(record(g), '0/1/0');
  });

  test('blackjack: dealer draws to 17 and stands on soft 17', () => {
    const g = game('10 A 9 2 4'); // dealer A 2, draws 4 → soft 17, stands
    g.deal();
    g.stand();
    assert.deepStrictEqual(g.dealer.map(c => c.rank), ['A', '2', '4']);
    assert.strictEqual(g.outcome, 'win', '19 beats 17');
  });

  test('blackjack: dealer busting is a win', () => {
    const g = game('10 10 8 6 K');
    g.deal();
    g.stand();
    assert.strictEqual(g.outcome, 'dealer-bust');
    assert.strictEqual(g.result, 'win');
  });

  test('blackjack: higher dealer total loses, equal totals push', () => {
    const lose = game('10 10 7 9');
    lose.deal(); lose.stand();
    assert.strictEqual(lose.outcome, 'lose');
    const push = game('10 10 8 8');
    push.deal(); push.stand();
    assert.strictEqual(push.outcome, 'push');
  });

  test('blackjack: hitting to 21 stands automatically', () => {
    const g = game('5 10 6 8 K'); // you 5 6 + K = 21; dealer 18
    g.deal();
    g.hit();
    assert.strictEqual(g.phase, 'done');
    assert.strictEqual(g.outcome, 'win');
  });

  test('blackjack: reshuffles when the shoe runs low', () => {
    const g = new Blackjack({}, Math.random);
    g.shoe = cards('10 9 8 7 6');
    g.deal();
    assert.ok(g.shoe.length > 190);
  });

  test('blackjack: record counts across hands and resets', () => {
    const g = game('A 9 K 7 10 6 6 10 K 10 10 8 8');
    g.deal();                 // blackjack: win
    g.deal(); g.hit();        // 10 6 + K: bust
    g.deal(); g.stand();      // 10 8 vs 10 8: push
    assert.strictEqual(record(g), '1/1/1');
    g.resetStats();
    assert.strictEqual(record(g), '0/0/0');
  });

  test('blackjack: a hand in progress survives a save and reload', () => {
    const g = game('10 9 7 8 2');
    g.deal();
    const restored = new Blackjack(JSON.parse(JSON.stringify(g)));
    assert.strictEqual(restored.phase, 'player');
    restored.hit();
    assert.strictEqual(Blackjack.value(restored.player).total, 19);
  });

  test('blackjack: keeps the record from the chip version and drops the chips', () => {
    const old = { bankroll: 1150, bet: 100, payout: 150, phase: 'betting', stats: { won: 4, lost: 2, pushed: 1 } };
    const g = new Blackjack(old);
    assert.strictEqual(g.phase, 'ready');
    assert.strictEqual(record(g), '4/2/1');
    assert.ok(!('bankroll' in g.toJSON()));
  });

  test('blackjack: ignores corrupt saved data', () => {
    const g = new Blackjack({ phase: 'player', player: 'x', outcome: 'jackpot', stats: { won: 'lots' } });
    assert.strictEqual(g.phase, 'ready');
    assert.strictEqual(g.outcome, null);
    assert.strictEqual(record(g), '0/0/0');
  });

  test('blackjack: every hand is recorded exactly once over many random hands', () => {
    let seed = 42;
    const rng = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const g = new Blackjack({}, rng);
    for (let i = 0; i < 2000; i++) {
      g.deal();
      while (g.phase === 'player') Blackjack.value(g.player).total < 17 ? g.hit() : g.stand();
      if (['win', 'lose', 'push', 'dealer-bust'].includes(g.outcome)) {
        assert.ok(Blackjack.value(g.dealer).total >= 17, `dealer stopped early on hand ${i}`);
      }
    }
    assert.strictEqual(g.stats.won + g.stats.lost + g.stats.pushed, 2000);
  });
};

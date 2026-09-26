// Blackjack tool: bet with chips, play against the CPU dealer. The dealer's turn is
// revealed one card at a time so it feels like playing someone.
(window.Tools = window.Tools || []).push((() => {
  const STORE_KEY = 'blackjack';
  const DEALER_PAUSE = 550; // ms between dealer cards
  const saved = Store.get(STORE_KEY, {});
  const game = new Blackjack(saved.game || {});
  let bet = Number(saved.bet) || 25;          // bet being built in the betting phase
  let shown = { player: 0, dealer: 0 };       // cards already on the table (for deal animations)
  let reveal = null;                          // dealer animation in progress
  let el = {};

  const save = () => Store.set(STORE_KEY, { game, bet });
  const money = n => Format.group(Format.number(n)); // 3:2 on odd bets can pay halves
  const RED = ['♥', '♦'];
  const SUIT_NAMES = { '♠': 'spades', '♥': 'hearts', '♦': 'diamonds', '♣': 'clubs' };
  const RANK_NAMES = { A: 'Ace', J: 'Jack', Q: 'Queen', K: 'King' };

  const MESSAGES = {
    blackjack: ['Blackjack!', 'good'],
    win: ['You win!', 'good'],
    'dealer-bust': ['Dealer busts!', 'good'],
    push: ['Push', 'even'],
    lose: ['Dealer wins', 'bad'],
    bust: ['Bust!', 'bad'],
    'dealer-blackjack': ['Dealer has blackjack', 'bad'],
  };

  // ---- Cards ----
  function cardEl(card, faceDown = false) {
    const div = document.createElement('div');
    if (faceDown) {
      div.className = 'card back';
      div.setAttribute('aria-label', 'Face-down card');
      return div;
    }
    div.className = 'card' + (RED.includes(card.suit) ? ' red' : '');
    div.setAttribute('aria-label', `${RANK_NAMES[card.rank] || card.rank} of ${SUIT_NAMES[card.suit]}`);
    const rank = document.createElement('span');
    rank.className = 'card-rank';
    rank.textContent = card.rank;
    const suit = document.createElement('span');
    suit.className = 'card-suit';
    suit.textContent = card.suit;
    div.append(rank, suit);
    return div;
  }

  function totalText(cards) {
    if (!cards.length) return '';
    const { total, soft } = Blackjack.value(cards);
    return soft && total < 21 ? `${total - 10} / ${total}` : String(total);
  }

  // How many dealer cards are face up right now.
  function dealerVisible() {
    if (reveal) return reveal.count;
    return game.phase === 'player' ? 1 : game.dealer.length;
  }

  function renderHand(container, cards, visible, who) {
    const fresh = shown[who] === 0 && cards.length === 2; // a new deal: interleave with the dealer
    container.replaceChildren(...cards.map((card, i) => {
      const faceDown = i >= visible;
      const node = cardEl(card, faceDown);
      if (i >= shown[who]) {
        node.classList.add('new');
        const order = fresh ? i * 2 + (who === 'dealer' ? 1 : 0) : i - shown[who];
        node.style.setProperty('--delay', `${order * 0.12}s`);
      } else if (who === 'dealer' && i === 1 && !faceDown && container.children[1]?.classList.contains('back')) {
        node.classList.add('flip');
      }
      return node;
    }));
    container.style.setProperty('--n', cards.length);
    shown[who] = cards.length;
  }

  // ---- Screen ----
  function render() {
    const visible = dealerVisible();
    // Only the hole card sits face down; cards the dealer hasn't drawn yet stay off the table.
    renderHand(el.dealerCards, game.dealer.slice(0, Math.max(visible, 2)), visible, 'dealer');
    renderHand(el.playerCards, game.player, game.player.length, 'player');
    el.dealerTotal.textContent = totalText(game.dealer.slice(0, visible));
    el.playerTotal.textContent = totalText(game.player);

    const settled = game.phase === 'done' && !reveal;
    const playing = game.phase === 'player' || reveal;
    const betting = game.phase === 'betting';

    // Chips shown: during the dealer's turn, hold back the result until it's revealed.
    const bankroll = reveal ? reveal.bankrollBefore : game.bankroll;
    el.bankroll.textContent = money(bankroll);
    el.bet.textContent = money(betting ? bet : game.bet);
    const { won, lost, pushed } = game.stats;
    el.record.textContent = `${won}W ${lost}L ${pushed}P`;

    let message = '', tone = '';
    if (betting) message = game.broke ? 'Out of chips' : 'Place your bet';
    else if (playing) message = reveal ? "Dealer's turn" : 'Hit or stand?';
    else if (settled) {
      const [text, cls] = MESSAGES[game.outcome];
      const net = game.payout;
      message = net ? `${text} ${net > 0 ? '+' : '−'}${money(Math.abs(net))}` : `${text}. Bet returned`;
      tone = cls;
    }
    el.message.textContent = message;
    el.message.className = 'bj-message ' + tone;

    el.betting.hidden = !betting || game.broke;
    el.playing.hidden = !playing;
    el.done.hidden = !settled || game.broke;
    el.broke.hidden = !(game.broke && !playing);

    for (const b of el.playing.querySelectorAll('button')) b.disabled = Boolean(reveal);
    el.double.disabled = Boolean(reveal) || !game.canDouble;
    for (const chip of el.chips.querySelectorAll('[data-chip]')) {
      chip.disabled = bet + Number(chip.dataset.chip) > game.bankroll;
    }
    el.deal.disabled = !game.canDeal(bet);
    el.again.disabled = !game.canDeal(Math.min(game.bet, game.bankroll));
    el.again.textContent = game.bet > game.bankroll ? `Deal ${money(game.bankroll)}` : 'Deal again';
  }

  // Plays the dealer's cards out one at a time after the hand has been settled.
  function revealDealer(bankrollBefore) {
    const drawn = game.dealer.length;
    const needsTurn = game.outcome !== 'bust'; // no need to draw if you bust
    reveal = { count: 2, bankrollBefore };
    render();
    const step = () => {
      if (!needsTurn || reveal.count >= drawn) {
        reveal = null;
        render();
        return;
      }
      reveal.count++;
      render();
      reveal.timer = setTimeout(step, DEALER_PAUSE);
    };
    reveal.timer = setTimeout(step, DEALER_PAUSE);
  }

  function finishReveal() {
    if (!reveal) return;
    clearTimeout(reveal.timer);
    reveal = null;
    render();
  }

  // Runs a player action; animates the dealer if the hand just ended.
  function act(action) {
    if (reveal) return;
    const bankrollBefore = game.bankroll;
    action();
    save();
    if (game.phase === 'done' && game.dealer.length >= 2) revealDealer(bankrollBefore);
    else render();
  }

  function deal(amount) {
    if (reveal || !game.canDeal(amount)) return;
    shown = { player: 0, dealer: 0 };
    bet = amount;
    const bankrollBefore = game.bankroll;
    game.deal(amount);
    save();
    if (game.phase === 'done') { // natural blackjack: flip the hole card after the deal lands
      reveal = { count: 1, bankrollBefore };
      render();
      reveal.timer = setTimeout(() => { reveal.count = 2; reveal.timer = setTimeout(finishReveal, 300); render(); }, 700);
    } else {
      render();
    }
  }

  function changeBet() {
    game.phase = 'betting';
    game.player = [];
    game.dealer = [];
    shown = { player: 0, dealer: 0 };
    bet = Math.min(bet, game.bankroll);
    save();
    render();
  }

  return {
    id: 'blackjack',
    title: 'Blackjack',

    init(root) {
      el = Object.fromEntries(['dealer-cards', 'player-cards', 'dealer-total', 'player-total', 'message',
        'bankroll', 'bet', 'record', 'betting', 'playing', 'done', 'broke', 'chips', 'clear', 'deal',
        'double', 'hit', 'stand', 'change', 'again', 'refill']
        .map(id => [id.replace(/-(\w)/g, (_, c) => c.toUpperCase()), root.querySelector(`#bj-${id}`)]));

      el.chips.addEventListener('click', e => {
        const chip = e.target.closest('[data-chip]');
        if (!chip || chip.disabled) return;
        bet += Number(chip.dataset.chip);
        save();
        render();
      });
      el.clear.addEventListener('click', () => { bet = 0; save(); render(); });
      el.deal.addEventListener('click', () => deal(bet));
      el.again.addEventListener('click', () => deal(Math.min(game.bet, game.bankroll)));
      el.change.addEventListener('click', changeBet);
      el.hit.addEventListener('click', () => act(() => game.hit()));
      el.stand.addEventListener('click', () => act(() => game.stand()));
      el.double.addEventListener('click', () => act(() => game.double()));
      el.refill.addEventListener('click', () => {
        game.newBankroll();
        bet = 25;
        shown = { player: 0, dealer: 0 };
        save();
        render();
      });
    },

    show() {
      // Cards already on the table shouldn't re-animate when you come back to the tab.
      shown = { player: game.player.length, dealer: game.dealer.length };
      render();
    },

    hide: finishReveal,

    // Betting: Enter deals. Playing: H hit, S stand, D double. After a hand: Enter deals again, B changes bet.
    key(e) {
      if (e.target.closest('button') && (e.key === ' ' || e.key === 'Enter')) return false;
      const k = e.key.toLowerCase();
      if (game.phase === 'betting' && k === 'enter') deal(bet);
      else if (game.phase === 'player' && k === 'h') act(() => game.hit());
      else if (game.phase === 'player' && k === 's') act(() => game.stand());
      else if (game.phase === 'player' && k === 'd') act(() => game.double());
      else if (game.phase === 'done' && !reveal && k === 'enter') deal(Math.min(game.bet, game.bankroll));
      else if (game.phase === 'done' && !reveal && k === 'b') changeBet();
      else return false;
      return true;
    },
  };
})());

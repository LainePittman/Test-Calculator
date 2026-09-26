// Blackjack tool: play against the CPU dealer and keep a win/loss/push record. The
// dealer's turn is revealed one card at a time so it feels like playing someone.
(window.Tools = window.Tools || []).push((() => {
  const STORE_KEY = 'blackjack';
  const DEALER_PAUSE = 550; // ms between dealer cards
  const saved = Store.get(STORE_KEY, {});
  const game = new Blackjack(saved.game || {});
  let shown = { player: 0, dealer: 0 }; // cards already on the table (for deal animations)
  let reveal = null;                    // dealer animation in progress
  let resetTimer = null;
  let el = {};

  const save = () => Store.set(STORE_KEY, { game });
  const RED = ['♥', '♦'];
  const SUIT_NAMES = { '♠': 'spades', '♥': 'hearts', '♦': 'diamonds', '♣': 'clubs' };
  const RANK_NAMES = { A: 'Ace', J: 'Jack', Q: 'Queen', K: 'King' };

  const MESSAGES = {
    blackjack: ['Blackjack! You win', 'good'],
    win: ['You win!', 'good'],
    'dealer-bust': ['Dealer busts! You win', 'good'],
    push: ['Push: a tie', 'even'],
    lose: ['Dealer wins', 'bad'],
    bust: ['Bust! Dealer wins', 'bad'],
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
    div.dataset.suit = SUIT_NAMES[card.suit]; // themes can draw suits their own way
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

  function renderTotal(output, cards) {
    if (!cards.length) {
      output.textContent = '';
      output.className = 'bj-total';
      return;
    }
    const { total, soft } = Blackjack.value(cards);
    output.textContent = soft && total < 21 ? `${total - 10}/${total}` : String(total);
    output.className = 'bj-total' + (total > 21 ? ' bust' : total === 21 ? ' twenty-one' : '');
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
    const dealerCards = game.dealer.slice(0, Math.max(visible, 2));
    renderHand(el.dealerCards, dealerCards, visible, 'dealer');
    renderHand(el.playerCards, game.player, game.player.length, 'player');
    renderTotal(el.dealerTotal, game.dealer.slice(0, visible));
    renderTotal(el.playerTotal, game.player);

    const settled = game.phase === 'done' && !reveal;
    const playing = game.phase === 'player' || Boolean(reveal);

    // Hold the record back until the dealer's cards have all been shown.
    const stats = { ...game.stats };
    if (reveal) stats[{ win: 'won', lose: 'lost', push: 'pushed' }[game.result]]--;
    el.won.textContent = stats.won;
    el.lost.textContent = stats.lost;
    el.pushed.textContent = stats.pushed;

    let message = '', tone = '';
    if (game.phase === 'ready') message = 'Tap Deal to play';
    else if (playing) message = reveal ? "Dealer's turn" : 'Hit or stand?';
    else if (settled) [message, tone] = MESSAGES[game.outcome];
    el.message.textContent = message;
    el.message.className = 'bj-message ' + tone;

    el.playing.hidden = !playing;
    el.hit.disabled = el.stand.disabled = Boolean(reveal);
    el.deal.hidden = playing;
    el.deal.textContent = settled ? 'Deal again' : 'Deal';
  }

  // Plays the dealer's cards out one at a time after the hand has been settled.
  function revealDealer() {
    const drawn = game.dealer.length;
    const needsTurn = game.outcome !== 'bust'; // no need to draw if you bust
    reveal = { count: 2 };
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

  function act(action) {
    if (reveal || game.phase !== 'player') return;
    action();
    save();
    if (game.phase === 'done') revealDealer();
    else render();
  }

  function deal() {
    if (reveal || game.phase === 'player') return;
    shown = { player: 0, dealer: 0 };
    game.deal();
    save();
    if (game.phase === 'done') { // a blackjack on the deal: flip the hole card once the cards land
      reveal = { count: 1 };
      render();
      reveal.timer = setTimeout(() => {
        reveal.count = 2;
        render();
        reveal.timer = setTimeout(finishReveal, 300);
      }, 700);
    } else {
      render();
    }
  }

  // Reset needs a second tap within 3 seconds, so the record isn't cleared by accident.
  function reset() {
    if (!el.reset.classList.contains('confirm')) {
      el.reset.classList.add('confirm');
      el.reset.textContent = 'Sure?';
      resetTimer = setTimeout(cancelReset, 3000);
      return;
    }
    cancelReset();
    game.resetStats();
    save();
    render();
  }

  function cancelReset() {
    clearTimeout(resetTimer);
    el.reset.classList.remove('confirm');
    el.reset.textContent = 'Reset';
  }

  return {
    id: 'blackjack',
    title: 'Blackjack',

    init(root) {
      el = Object.fromEntries(['dealer-cards', 'player-cards', 'dealer-total', 'player-total', 'message',
        'won', 'lost', 'pushed', 'reset', 'playing', 'hit', 'stand', 'deal']
        .map(id => [id.replace(/-(\w)/g, (_, c) => c.toUpperCase()), root.querySelector(`#bj-${id}`)]));
      el.deal.addEventListener('click', deal);
      el.hit.addEventListener('click', () => act(() => game.hit()));
      el.stand.addEventListener('click', () => act(() => game.stand()));
      el.reset.addEventListener('click', reset);
    },

    show() {
      // Cards already on the table shouldn't re-animate when you come back to the tab.
      shown = { player: game.player.length, dealer: game.dealer.length };
      render();
    },

    hide() {
      finishReveal();
      cancelReset();
    },

    // Enter deals; H hits, S stands.
    key(e) {
      if (e.target.closest('button') && (e.key === ' ' || e.key === 'Enter')) return false;
      const k = e.key.toLowerCase();
      if (k === 'enter' && game.phase !== 'player') deal();
      else if (k === 'h' && game.phase === 'player') act(() => game.hit());
      else if (k === 's' && game.phase === 'player') act(() => game.stand());
      else return false;
      return true;
    },
  };
})());

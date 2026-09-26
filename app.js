(() => {
  const calc = new Calculator();
  const resultEl = document.getElementById('result');
  const exprEl = document.getElementById('expression');
  const clearBtn = document.getElementById('clear');
  const opButtons = document.querySelectorAll('[data-op]');
  const symbols = { '+': '+', '-': '−', '*': '×', '/': '÷' };

  function prettyNumber(str) {
    if (str === 'Error' || str.includes('e')) return str;
    const [int, dec] = str.split('.');
    const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return dec !== undefined ? `${grouped}.${dec}` : grouped;
  }

  function fitText() {
    resultEl.style.fontSize = '';
    const display = getComputedStyle(resultEl.parentElement);
    const max = resultEl.parentElement.clientWidth
      - parseFloat(display.paddingLeft) - parseFloat(display.paddingRight);
    let size = parseFloat(getComputedStyle(resultEl).fontSize);
    while (resultEl.scrollWidth > max && size > 20) {
      size -= 2;
      resultEl.style.fontSize = size + 'px';
    }
  }

  function render() {
    resultEl.textContent = prettyNumber(calc.current).replace('-', '−');
    exprEl.textContent = calc.operator
      ? `${prettyNumber(Calculator.format(calc.previous))} ${symbols[calc.operator]}`
      : '';
    clearBtn.textContent = calc.current !== '0' && !calc.overwrite ? 'C' : 'AC';
    opButtons.forEach(b => b.classList.toggle(
      'selected', b.dataset.op === calc.operator && calc.overwrite));
    fitText();
  }

  function press(btn) {
    const { digit, op, action } = btn.dataset;
    if (digit !== undefined) calc.inputDigit(digit);
    else if (op) calc.setOperator(op);
    else if (action === 'clear') btn.textContent === 'C' ? calc.clearEntry() : calc.clear();
    else if (action === 'sign') calc.toggleSign();
    else if (action === 'percent') calc.percent();
    else if (action === 'decimal') calc.inputDecimal();
    else if (action === 'equals') calc.equals();
    if (navigator.vibrate) navigator.vibrate(8);
    render();
  }

  document.querySelector('.keys').addEventListener('click', e => {
    const btn = e.target.closest('button');
    if (btn) press(btn);
  });

  // Theme picker
  const settings = document.getElementById('settings');
  const settingsBtn = document.getElementById('settings-btn');
  const themeOptions = document.getElementById('theme-options');

  function renderThemeOptions() {
    const current = document.documentElement.dataset.calcTheme;
    themeOptions.replaceChildren(...Themes.list.map(theme => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'theme-option';
      btn.dataset.themeId = theme.id;
      btn.setAttribute('role', 'radio');
      btn.setAttribute('aria-checked', String(theme.id === current));
      const swatch = document.createElement('span');
      swatch.className = 'swatch';
      for (const color of theme.preview) {
        const dot = document.createElement('i');
        dot.style.background = color;
        swatch.append(dot);
      }
      const name = document.createElement('span');
      name.className = 'theme-name';
      name.textContent = theme.name;
      btn.append(swatch, name);
      return btn;
    }));
  }

  function openSettings() {
    renderThemeOptions();
    settings.hidden = false;
    settingsBtn.setAttribute('aria-expanded', 'true');
    themeOptions.querySelector('[aria-checked="true"]').focus();
  }

  function closeSettings() {
    settings.hidden = true;
    settingsBtn.setAttribute('aria-expanded', 'false');
    settingsBtn.focus();
  }

  function setTheme(id) {
    const theme = Themes.apply(id);
    Themes.save(theme.id);
    renderThemeOptions();
    themeOptions.querySelector(`[data-theme-id="${theme.id}"]`).focus();
    fitText();
    // Web fonts load lazily; re-fit once the theme's font is ready.
    if (document.fonts) document.fonts.ready.then(fitText);
  }

  settingsBtn.addEventListener('click', openSettings);
  document.getElementById('settings-done').addEventListener('click', closeSettings);
  settings.addEventListener('click', e => { if (e.target === settings) closeSettings(); });
  themeOptions.addEventListener('click', e => {
    const btn = e.target.closest('[data-theme-id]');
    if (btn) setTheme(btn.dataset.themeId);
  });

  // Keyboard support for desktop / hardware keyboards.
  document.addEventListener('keydown', e => {
    if (!settings.hidden) {
      if (e.key === 'Escape') closeSettings();
      return;
    }
    const k = e.key;
    if (/^\d$/.test(k)) calc.inputDigit(k);
    else if (k === '.' || k === ',') calc.inputDecimal();
    else if ('+-*/'.includes(k) && k.length === 1) calc.setOperator(k);
    else if (k === 'Enter' || k === '=') { e.preventDefault(); calc.equals(); }
    else if (k === 'Escape') calc.clear();
    else if (k === 'Backspace') calc.clearEntry();
    else if (k === '%') calc.percent();
    else return;
    render();
  });

  window.addEventListener('resize', fitText);
  render();
  if (document.fonts) document.fonts.ready.then(fitText);

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('sw.js');
  }
})();

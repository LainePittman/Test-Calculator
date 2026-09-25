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
    const max = resultEl.parentElement.clientWidth - 16;
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

  // Keyboard support for desktop / hardware keyboards.
  document.addEventListener('keydown', e => {
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

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('sw.js');
  }
})();

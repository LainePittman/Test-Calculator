// Calculator tool: connects the keypad and keyboard to lib/calculator.js.
(window.Tools = window.Tools || []).push((() => {
  const calc = new Calculator();
  const symbols = { '+': '+', '-': '−', '*': '×', '/': '÷' };
  let resultEl, exprEl, clearBtn, opButtons;

  const fit = () => fitText(resultEl, 16);

  function render() {
    resultEl.textContent = Format.group(calc.current).replace('-', '−');
    exprEl.textContent = calc.operator
      ? `${Format.group(Calculator.format(calc.previous))} ${symbols[calc.operator]}`
      : '';
    clearBtn.textContent = calc.current !== '0' && !calc.overwrite ? 'C' : 'AC';
    opButtons.forEach(b => b.classList.toggle(
      'selected', b.dataset.op === calc.operator && calc.overwrite));
    fit();
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

  return {
    id: 'calculator',
    title: 'Calculator',

    init(root) {
      resultEl = root.querySelector('#calc-result');
      exprEl = root.querySelector('#calc-expression');
      clearBtn = root.querySelector('#calc-clear');
      opButtons = root.querySelectorAll('[data-op]');
      root.querySelector('.keypad').addEventListener('click', e => {
        const btn = e.target.closest('button');
        if (btn) press(btn);
      });
    },

    show: render,
    refresh: fit,

    // Hardware keyboard. Returns true when the key was used.
    key(e) {
      const k = e.key;
      if (/^\d$/.test(k)) calc.inputDigit(k);
      else if (k === '.' || k === ',') calc.inputDecimal();
      else if (k.length === 1 && '+-*/'.includes(k)) calc.setOperator(k);
      else if (k === 'Enter' || k === '=') calc.equals();
      else if (k === 'Escape') calc.clear();
      else if (k === 'Backspace') calc.clearEntry();
      else if (k === '%') calc.percent();
      else return false;
      render();
      return true;
    },
  };
})());

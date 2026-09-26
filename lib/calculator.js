// Pure calculator state machine; no DOM access so it can be tested in Node.
if (typeof module !== 'undefined') globalThis.Format = require('./format.js');

class Calculator {
  constructor() { this.clear(); }

  clear() {
    this.current = '0';      // number being typed / shown
    this.previous = null;    // left operand
    this.operator = null;    // pending operator
    this.overwrite = true;   // next digit replaces current
    this.lastOp = null;      // for repeated "="
    this.error = false;
  }

  clearEntry() {
    this.current = '0';
    this.overwrite = true;
  }

  inputDigit(d) {
    if (this.error) this.clear();
    if (this.overwrite) {
      this.current = d;
      this.overwrite = false;
    } else if (this.current.replace(/[-.]/g, '').length < 15) {
      this.current = this.current === '0' ? d : this.current + d;
    }
  }

  inputDecimal() {
    if (this.error) this.clear();
    if (this.overwrite) {
      this.current = '0.';
      this.overwrite = false;
    } else if (!this.current.includes('.')) {
      this.current += '.';
    }
  }

  toggleSign() {
    if (this.error) return;
    this.current = this.current.startsWith('-') ? this.current.slice(1) : '-' + this.current;
    if (this.current === '-0' && this.overwrite) this.current = '0';
  }

  percent() {
    if (this.error) return;
    const value = parseFloat(this.current);
    // With a pending + or −, % means "percent of the left operand" (e.g. 200 + 10% = 220).
    const result = this.previous !== null && (this.operator === '+' || this.operator === '-')
      ? this.previous * value / 100
      : value / 100;
    this.current = Calculator.format(result);
    this.overwrite = true;
  }

  setOperator(op) {
    if (this.error) return;
    if (this.operator && !this.overwrite) {
      this.compute();
      if (this.error) return;
    }
    this.previous = parseFloat(this.current);
    this.operator = op;
    this.overwrite = true;
    this.lastOp = null;
  }

  equals() {
    if (this.error) return;
    if (this.operator) {
      const rhs = parseFloat(this.current);
      this.lastOp = { op: this.operator, rhs };
      this.compute();
    } else if (this.lastOp) {
      // Repeated "=" re-applies the last operation.
      this.previous = parseFloat(this.current);
      this.operator = this.lastOp.op;
      this.current = Calculator.format(this.lastOp.rhs);
      this.compute();
    }
    this.overwrite = true;
  }

  compute() {
    const a = this.previous;
    const b = parseFloat(this.current);
    let r;
    switch (this.operator) {
      case '+': r = a + b; break;
      case '-': r = a - b; break;
      case '*': r = a * b; break;
      case '/': r = b === 0 ? NaN : a / b; break;
      default: return;
    }
    this.previous = null;
    this.operator = null;
    this.overwrite = true;
    if (!isFinite(r)) {
      this.current = 'Error';
      this.error = true;
    } else {
      this.current = Calculator.format(r);
    }
  }

  static format(n) {
    return Format.number(n);
  }
}

if (typeof module !== 'undefined') module.exports = Calculator;

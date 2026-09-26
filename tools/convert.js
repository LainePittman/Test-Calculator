// Unit converter tool: pick a category, units and an amount; converts as you type.
// Remembers the category, amount and the units last used in each category.
(window.Tools = window.Tools || []).push((() => {
  const STORE_KEY = 'converter';
  const saved = Store.get(STORE_KEY, {});
  const state = {
    category: Units.category(saved.category).id,
    value: typeof saved.value === 'string' ? saved.value : '1',
    units: saved.units && typeof saved.units === 'object' ? saved.units : {},
  };
  let el = {};

  const save = () => Store.set(STORE_KEY, state);
  const show = n => Format.group(Format.number(n)).replace('-', '−');

  // Units for the current category, falling back to its defaults if saved ones are gone.
  function currentUnits() {
    const cat = Units.category(state.category);
    const [from, to] = state.units[cat.id] || cat.defaults;
    return Units.unit(cat.id, from) && Units.unit(cat.id, to) ? [from, to] : cat.defaults;
  }

  function fillSelect(select, cat, selected) {
    select.replaceChildren(...cat.units.map(u => new Option(`${u.name} (${u.symbol})`, u.id, false, u.id === selected)));
  }

  function renderCategory() {
    const cat = Units.category(state.category);
    const [from, to] = currentUnits();
    for (const chip of el.categories.children) {
      chip.setAttribute('aria-pressed', String(chip.dataset.category === cat.id));
    }
    fillSelect(el.from, cat, from);
    fillSelect(el.to, cat, to);
    convert();
  }

  function convert() {
    const cat = Units.category(state.category);
    const from = el.from.value, to = el.to.value;
    const amount = Units.parse(state.value);
    const blank = state.value.trim() === '';
    el.value.setAttribute('aria-invalid', String(!blank && Number.isNaN(amount)));
    el.result.textContent = Number.isNaN(amount) ? '—' : show(Units.convert(amount, cat.id, from, to));
    const f = Units.unit(cat.id, from), t = Units.unit(cat.id, to);
    el.formula.textContent = `1 ${f.symbol} = ${show(Units.convert(1, cat.id, from, to))} ${t.symbol}`;
    fit();
  }

  const fit = () => { fitText(el.value); fitText(el.result); };

  function rememberUnits() {
    state.units[state.category] = [el.from.value, el.to.value];
    save();
  }

  return {
    id: 'convert',
    title: 'Unit Converter',

    init(root) {
      el = {
        categories: root.querySelector('#conv-categories'),
        from: root.querySelector('#conv-from'),
        to: root.querySelector('#conv-to'),
        value: root.querySelector('#conv-value'),
        result: root.querySelector('#conv-result'),
        formula: root.querySelector('#conv-formula'),
      };
      el.categories.replaceChildren(...Units.categories.map(c => {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'chip';
        chip.dataset.category = c.id;
        chip.textContent = c.name;
        return chip;
      }));
      el.value.value = state.value;

      el.categories.addEventListener('click', e => {
        const chip = e.target.closest('[data-category]');
        if (!chip) return;
        state.category = chip.dataset.category;
        save();
        renderCategory();
        chip.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      });
      el.value.addEventListener('input', () => {
        state.value = el.value.value;
        save();
        convert();
      });
      for (const select of [el.from, el.to]) {
        select.addEventListener('change', () => { rememberUnits(); convert(); });
      }
      root.querySelector('#conv-swap').addEventListener('click', () => {
        [el.from.value, el.to.value] = [el.to.value, el.from.value];
        rememberUnits();
        convert();
      });
      renderCategory();
    },

    show: renderCategory,
    refresh: fit,
  };
})());

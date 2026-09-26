// App shell: tab bar, switching tools, theme picker, keyboard routing.
// Each tool in tools/*.js pushes { id, title, init(root), show?, hide?, refresh?, key? }
// onto window.Tools; its panel is #tool-<id> and its tab is [data-tab=<id>].
(() => {
  const tools = window.Tools || [];
  const titleEl = document.getElementById('tool-title');
  const tabbar = document.querySelector('.tabbar');
  const tabs = [...tabbar.querySelectorAll('[data-tab]')];
  const LAST_TOOL_KEY = 'app-last-tool';
  let active = null;

  const panel = tool => document.getElementById(`tool-${tool.id}`);

  function show(id) {
    const tool = tools.find(t => t.id === id) || tools[0];
    if (tool === active) return;
    if (active) {
      active.hide?.();
      panel(active).hidden = true;
    }
    active = tool;
    panel(tool).hidden = false;
    titleEl.textContent = tool.title;
    for (const tab of tabs) {
      const selected = tab.dataset.tab === tool.id;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
    }
    tool.show?.();
    try { localStorage.setItem(LAST_TOOL_KEY, tool.id); } catch {}
    history.replaceState(null, '', '#' + tool.id);
  }

  for (const tool of tools) tool.init(panel(tool));
  tabbar.style.setProperty('--tab-count', tabs.length);

  tabbar.addEventListener('click', e => {
    const tab = e.target.closest('[data-tab]');
    if (tab) show(tab.dataset.tab);
  });

  // Arrow keys move between tabs, as in any tab list.
  tabbar.addEventListener('keydown', e => {
    const step = { ArrowLeft: -1, ArrowRight: 1 }[e.key];
    if (!step) return;
    const i = (tabs.findIndex(t => t.dataset.tab === active.id) + step + tabs.length) % tabs.length;
    show(tabs[i].dataset.tab);
    tabs[i].focus();
    e.stopPropagation();
  });

  window.addEventListener('hashchange', () => show(location.hash.slice(1)));

  // ---- Theme picker -----------------------------------------------------
  const settings = document.getElementById('settings');
  const settingsBtn = document.getElementById('settings-btn');
  const themeOptions = document.getElementById('theme-options');

  function renderThemeOptions() {
    const current = document.documentElement.dataset.appTheme;
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

  settingsBtn.addEventListener('click', openSettings);
  document.getElementById('settings-done').addEventListener('click', closeSettings);
  settings.addEventListener('click', e => { if (e.target === settings) closeSettings(); });
  themeOptions.addEventListener('click', e => {
    const btn = e.target.closest('[data-theme-id]');
    if (!btn) return;
    Themes.save(Themes.apply(btn.dataset.themeId).id);
    renderThemeOptions();
    themeOptions.querySelector(`[data-theme-id="${btn.dataset.themeId}"]`).focus();
  });

  // Tools re-measure after a theme change, resize, or the pixel font arriving.
  const refresh = () => active?.refresh?.();
  document.addEventListener('themechange', () => {
    refresh();
    document.fonts?.ready.then(refresh);
  });
  window.addEventListener('resize', refresh);
  document.fonts?.ready.then(refresh);

  // ---- Keyboard ---------------------------------------------------------
  document.addEventListener('keydown', e => {
    if (!settings.hidden) {
      if (e.key === 'Escape') closeSettings();
      return;
    }
    if (e.target.closest('input, select, textarea')) return;
    if (e.target.closest('[role="tab"]') && (e.key === 'Enter' || e.key === ' ')) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (active?.key?.(e)) e.preventDefault();
  });

  // ---- Start ------------------------------------------------------------
  let last = null;
  try { last = localStorage.getItem(LAST_TOOL_KEY); } catch {}
  show(location.hash.slice(1) || last);

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('sw.js');
  }
})();

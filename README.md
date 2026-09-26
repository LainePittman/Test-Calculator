# Pocket Tools

A collection of small, mobile-first tools in one installable web app (plain
HTML/CSS/JS, no build step). Runs in any phone browser, can be added to the home
screen, and works offline.

## Tools
- **Calculator**: add, subtract, multiply, divide, percent, +/−, repeated `=`,
  thousands separators, keyboard support
- **Stopwatch**: start/stop, laps with fastest and slowest highlighted; keeps
  running while the app is closed (Space, L, R on a keyboard)
- **Timer**: type a length like a microwave (`5 0 0` = 5 minutes) or tap a preset;
  pause, +1 minute, and an alarm that beeps and vibrates (a chiptune beep in the
  Pixel theme). Finishes on time even if the app was closed, and opens to it
- **Unit converter**: length, weight, temperature, volume (US) and speed; converts
  as you type, swap button, remembers your units per category. Accepts `1,5` or `1.5`

## Themes
Tap the sliders button (top right) to pick a theme. The choice applies to every
tool and is remembered on the device.
- **Classic**: black with round keys and orange accents
- **Pixel**: 8-bit palette, square notched keys, pixel font, LCD-style readouts

## Run locally
```sh
python3 -m http.server 8000
# open http://localhost:8000 (or http://<your-computer-ip>:8000 from your phone)
```
To install it on a phone, host the folder on any static host (e.g. GitHub Pages),
open it in the browser, and choose **Add to Home Screen**.

## Tests
```sh
npm test                 # unit tests for the logic in lib/ and themes.js (no install needed: node test.js)
npm install              # once, for the browser tests
npm run test:browser     # drives every tool at phone size in both themes
SCREENSHOTS=1 npm run test:browser   # also saves screenshots to test-screenshots/
```

## How it's put together
- `index.html`: app shell (title bar, tab bar, theme sheet) and each tool's panel
- `app.js`: switches tools, theme picker, keyboard routing
- `themes.js`: list of themes; saves the chosen one
- `style.css`: theme tokens, then shared components (`.btn`, `.readout`, `.keypad`,
  `.chip`, `.field`, `.list`), then per-tool layout, then Pixel overrides
- `lib/`: pure logic with no DOM access, unit tested in Node (plus two tiny shared
  browser helpers: `store.js` for saving, `fit.js` for shrinking big numbers to fit)
- `tools/`: one file per tool that connects its panel to its logic
- `tests/`: unit tests (`*.test.js`) and browser tests (`browser.js`)
- `scripts/build-single.js`: bundles everything into one HTML file (`npm run build:single`)
- `sw.js`, `manifest.webmanifest`, `icons/`, `fonts/`: offline support, install, pixel font (SIL OFL)

### Adding a tool
1. Logic in `lib/<tool>.js` with unit tests in `tests/<tool>.test.js`
2. A `<section class="tool" id="tool-<id>">` panel and a tab button in `index.html`,
   built from the shared components so every theme styles it automatically
3. `tools/<id>.js` pushing `{ id, title, init(root), show, hide, refresh, key }` onto `window.Tools`
4. Browser tests in `tests/browser.js`; add the new files to `sw.js`

### Adding a theme
Add an entry to `themes.js` and a `:root[data-app-theme="<id>"]` block in `style.css`
that sets every token (the unit tests check none are missing).

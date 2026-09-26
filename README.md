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

## Games
- **Blackjack**: play against a CPU dealer and keep a record of wins, losses and pushes
  (saved between visits; Reset asks twice). Hit or stand; big hand totals turn green at
  21 and red on a bust. The dealer draws to 16 and stands on all 17s from a 4-deck
  shoe, revealing one card at a time. Keys: Enter, H, S

## Themes
Tap the sliders button (top right) to pick a theme. The choice applies to every
tool and is remembered on the device.
- **Classic**: black with round keys and orange accents
- **Pixel**: 8-bit palette, square notched keys, pixel font, LCD-style readouts,
  chiptune timer beep
- **Art Deco**: black lacquer, gold and cream; Poiret One and Josefin Sans type, gold
  sunburst readouts, double gold rules, emerald fan card backs, two-tone chime alarm
- **ASCII Art**: monochrome text mode in IBM Plex Mono. Frames drawn with characters
  (`+---+` keys, `.---.` secondary, `#===#` primary), big readouts drawn as ASCII-art
  digits, `> PROMPT_` titles, reverse video on press, `####....` progress bar, text-art
  cards with `<3` `<>` `^` `&` suits, and a terminal-bell alarm

Each theme also sets the timer's alarm sound (`sound` in `themes.js`), and can ask for
big readouts marked `data-figlet` to be drawn as ASCII art (`figlet: true`, see `lib/figlet.js`).

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
npm run test:browser     # drives every tool at phone size in every theme
SCREENSHOTS=1 npm run test:browser   # also saves screenshots to test-screenshots/
```

## How it's put together
- `index.html`: app shell (title bar, tab bar, theme sheet) and each tool's panel
- `app.js`: switches tools, theme picker, keyboard routing
- `themes.js`: list of themes; saves the chosen one
- `style.css`: theme tokens, then shared components (`.btn`, `.readout`, `.keypad`,
  `.chip`, `.field`, `.list`, `.card`), then per-tool layout, then per-theme overrides
- `lib/`: pure logic with no DOM access, unit tested in Node (plus two tiny shared
  browser helpers: `store.js` for saving, `fit.js` for shrinking big numbers to fit)
- `tools/`: one file per tool that connects its panel to its logic
- `tests/`: unit tests (`*.test.js`) and browser tests (`browser.js`)
- `scripts/build-single.js`: bundles everything into one HTML file (`npm run build:single`)
- `sw.js`, `manifest.webmanifest`, `icons/`, `fonts/`: offline support, install, theme fonts
  (all SIL OFL; licences in `fonts/OFL-*.txt`)

### Adding a tool
1. Logic in `lib/<tool>.js` with unit tests in `tests/<tool>.test.js`
2. A `<section class="tool" id="tool-<id>">` panel and a tab button in `index.html`,
   built from the shared components so every theme styles it automatically
3. `tools/<id>.js` pushing `{ id, title, init(root), show, hide, refresh, key }` onto `window.Tools`
4. Browser tests in `tests/browser.js`; add the new files to `sw.js`

### Adding a theme
Add an entry to `themes.js` (name, colour, preview swatches, alarm sound) and a
`:root[data-app-theme="<id>"]` block in `style.css` that sets every token (the unit
tests check none are missing), plus any component overrides at the end of the file.
Add its id to `THEMES` in `tests/browser.js` so every tool is tested in it.

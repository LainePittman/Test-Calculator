# Calculator

A simple, mobile-first calculator. It's a Progressive Web App (plain HTML/CSS/JS,
no build step), so it runs in any phone browser. You can add it to the home screen
and it works offline.

## Features
- Add, subtract, multiply, divide, percent, and +/−
- Repeated `=` repeats the last operation
- Shrinks long numbers to fit and adds thousands separators
- Rounds away floating-point noise (0.1 + 0.2 = 0.3)
- Shows `Error` on divide by zero
- Works with a hardware keyboard (digits, `+ - * /`, Enter, Esc, Backspace)
- Respects safe areas on notched phones; installable and works offline

## Run locally
```sh
python3 -m http.server 8000
# open http://localhost:8000 (or http://<your-computer-ip>:8000 from your phone)
```

To install it on a phone, host the folder on any static host (e.g. GitHub Pages),
open it in the browser, and choose **Add to Home Screen**.

## Tests
```sh
node test.js
```

## Files
- `index.html`: page layout
- `style.css`: styles
- `calculator.js`: calculator logic (no DOM access, so it can be unit tested)
- `app.js`: connects the buttons and keyboard to the logic
- `sw.js`, `manifest.webmanifest`, `icons/`: offline support and installability

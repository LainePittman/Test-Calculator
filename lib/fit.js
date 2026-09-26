// Shrinks an element's font until its text fits on one line (used for big numbers).
function fitText(el, minPx = 14) {
  if (!el.offsetParent) return; // hidden
  el.style.fontSize = '';
  const box = getComputedStyle(el.parentElement);
  const max = el.parentElement.clientWidth - parseFloat(box.paddingLeft) - parseFloat(box.paddingRight);
  let size = parseFloat(getComputedStyle(el).fontSize);
  while ((el.scrollWidth > max || el.scrollWidth > el.clientWidth) && size > minPx) {
    size -= 1;
    el.style.fontSize = size + 'px';
  }
}

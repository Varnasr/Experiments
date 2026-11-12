/* Folds the opening explanation of a tool page to two lines on a phone and
   adds the button that opens it. The fold is a class the stylesheet only acts
   on below 700px, so a wide screen shows the whole text and the button stays
   hidden. Without this script the text is simply shown in full. */
(function () {
  var lede = document.querySelector('.lede');
  if (!lede) return;
  if (!lede.id) lede.id = 'lede';
  var btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'lede-more';
  btn.setAttribute('aria-controls', lede.id);
  function set(open) {
    lede.classList.toggle('folded', !open);
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    btn.textContent = open ? 'Show less' : 'Read more';
  }
  btn.addEventListener('click', function () { set(btn.getAttribute('aria-expanded') !== 'true'); });
  lede.insertAdjacentElement('afterend', btn);
  set(false);
})();

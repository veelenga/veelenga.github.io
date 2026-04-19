var HALF_CELL = 16; // half of 32px fine grid cell

function alignGrid() {
  var title = document.querySelector('.hero h1');
  var hero = document.querySelector('.hero');
  if (!title || !hero) return;

  var rect = title.getBoundingClientRect();
  var heroRect = hero.getBoundingClientRect();

  // X: center grid on viewport so no major line crosses centered text
  var x = heroRect.width / 2 + HALF_CELL;
  // Y: align to title top
  var y = rect.top - heroRect.top - HALF_CELL;

  hero.style.setProperty('--grid-x', x + 'px');
  hero.style.setProperty('--grid-y', y + 'px');
}

var rafId;
window.addEventListener('resize', function() {
  cancelAnimationFrame(rafId);
  rafId = requestAnimationFrame(alignGrid);
});

if (document.fonts && document.fonts.ready) {
  document.fonts.ready.then(alignGrid);
} else {
  window.addEventListener('load', alignGrid);
}

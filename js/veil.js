/* ============================================================
   枕梦索 · 入梦转场
   每次换页，雾从四周合拢；在雾最浓的一瞬切换视图，再散开。
   像闭上眼，再睁开时已在另一个房间。
   ============================================================ */

const Veil = (() => {
  let el = null;
  let wordEl = null;
  let running = false;

  const WORDS = [
    '潜入梦中…',
    '穿过雾…',
    '慢慢下沉…',
    '夜色合拢…',
    '屏住呼吸…',
    '意识变轻…',
  ];

  function init() {
    el = document.createElement('div');
    el.id = 'dream-veil';
    el.setAttribute('aria-hidden', 'true');
    el.innerHTML = `
      <div class="veil-mist m1"></div>
      <div class="veil-mist m2"></div>
      <div class="veil-mist m3"></div>
      <div class="veil-grain"></div>
      <div class="veil-word"></div>
    `;
    document.body.appendChild(el);
    wordEl = el.querySelector('.veil-word');
  }

  /**
   * 执行一次入梦转场
   * @param {Function} mid   雾最浓时执行（通常是切换视图）
   * @param {Object}   opts  { word: 自定义呓语 }
   * @returns {Promise}
   */
  function run(mid, opts = {}) {
    if (!el) { mid && mid(); return Promise.resolve(); }
    if (running) { mid && mid(); return Promise.resolve(); }
    running = true;

    return new Promise((resolve) => {
      wordEl.textContent = opts.word || WORDS[Math.floor(Math.random() * WORDS.length)];

      /* 雾起 */
      el.classList.add('is-in');

      /* 雾最浓：切换视图 */
      setTimeout(() => {
        try { mid && mid(); } catch (e) { /* 不阻断转场 */ }
        el.classList.add('is-out');
      }, 640);

      /* 雾散，收尾 */
      setTimeout(() => {
        el.classList.remove('is-in', 'is-out');
        running = false;
        resolve();
      }, 1420);
    });
  }

  return { init, run };
})();

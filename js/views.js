/* ============================================================
   枕梦索 · 视图切换与渲染协调
   ============================================================ */

const Views = (() => {
  let version = 0;
  /* ---- 进入指定视图 ---- */
  function show(name, options = {}) {
    const request = ++version;
    const views = document.querySelectorAll('.view');
    views.forEach(v => { v.classList.remove('is-active'); v.inert = true; });

    /* 决定下一步行为 */
    setTimeout(() => {
      if (request !== version) return;
      const target = document.querySelector(`[data-view="${name}"]`);
      if (!target) return;
      target.classList.add('is-active');
      target.inert = false;

      /* 滚动到顶 */
      window.scrollTo({ top: 0, behavior: 'instant' });

      /* 底部导航显隐 */
      const nav = document.getElementById('bottomNav');
      const showNav = ['dashboard', 'write', 'insights', 'settings'].includes(name);
      nav.style.display = showNav ? 'flex' : 'none';
      /* 高亮当前 */
      nav.querySelectorAll('button').forEach(b => {
        b.classList.toggle('is-active', b.dataset.go === name);
      });

      /* 顶部 chrome 标题 */
      const chromeTitle = document.getElementById('chromeTitle');
      const titles = {
        landing: '枕梦索',
        onboarding: '初次见面',
        dashboard: '梦境殿堂',
        write: '记录梦境',
        detail: '梦境回放',
        insights: '看见自己',
        settings: '设置',
      };
      chromeTitle.textContent = titles[name] || '枕梦索';

      /* 触发对应渲染 */
      if (name === 'dashboard') Dreams.renderDashboard();
      if (name === 'insights') Dreams.renderInsights();
      if (name === 'settings') initSettings();

      /* 流星雨（每 4 次进入页面随机触发一次） */
      if (Math.random() < 0.3) Starfield.maybeShootingStar();
    }, options.delay || 0);
  }

  /* ---- 设置页初始化 ---- */
  function initSettings() {
    const user = Storage.getUser();
    document.getElementById('settingName').value = user.name || '';

    const settings = Storage.getSettings();
    document.querySelectorAll('.toggle').forEach(t => {
      const key = t.dataset.toggle;
      const on = t.getAttribute('aria-disabled') !== 'true' && !!settings[key];
      t.classList.toggle('is-on', on);
      t.setAttribute('aria-checked', String(on));
    });

    /* 主题选择 */
    const theme = user.theme || 'night';
    document.querySelectorAll('.theme-chip').forEach(c => {
      c.classList.toggle('is-active', c.dataset.theme === theme);
    });
  }

  return { show };
})();

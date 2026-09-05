/* ============================================================
   枕梦索 · 魔法交互包
   非传统的、梦境感的一切：
   3D 倾斜 / 首页视差 / 滚动显现 / 雾中丝带
   ⌘K 寻梦 / 现实检验气泡 / 打盹模式 / 灵感提词 / 快捷键
   ============================================================ */

const Magic = (() => {

  /* ================== 灵感提词句 ================== */
  const PROMPTS = [
    '梦里最先出现的颜色，是什么？',
    '有没有人看着你？TA 的眼神是什么样的？',
    '你在梦里移动的方式——走、飞、还是漂？',
    '梦里的天气，和今天现实里一样吗？',
    '有没有一个地方，你去过不止一次？',
    '如果给这个梦配一种声音，会是什么？',
    '梦里的你，和醒着的你，是同一个人吗？',
    '有没有一样东西，你不该带走，却带走了？',
  ];

  /* ================== 现实检验提示 ================== */
  const REALITY_TIPS = [
    '看看自己的手——梦里的手指常常会多一根，或少一根。',
    '找个时钟看两次。梦里，时间从不对齐。',
    '捏住鼻子试着呼吸。梦里，你依然能呼吸。',
    '读一句话，移开，再读一次。梦里，文字会悄悄改变。',
    '问问自己：我是怎么来到这里的？梦，没有来路。',
    '试着轻轻跳一下。梦里，落地总是慢半拍。',
  ];

  function init() {
    initTilt();
    initParallax();
    initScrollReveal();
    initRibbons();
    initSearch();
    initRealityBubble();
    initChromeDots();
    initShortcuts();
    initPromptButton();
  }

  /* ============================================================
     3D 倾斜：卡片随鼠标轻轻转身，像水面上的叶子
     ============================================================ */
  function initTilt() {
    const MAX = 6; /* 最大转角 */
    document.addEventListener('mousemove', (e) => {
      const card = e.target.closest('.dream-card, .feature-card, .stat-card, .moon-card');
      document.querySelectorAll('.tilting').forEach(el => {
        if (el !== card) resetTilt(el);
      });
      if (!card) return;
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      card.classList.add('tilting');
      card.style.transform =
        `translateY(-3px) perspective(900px) rotateX(${(-py * MAX).toFixed(2)}deg) rotateY(${(px * MAX).toFixed(2)}deg)`;
      card.style.setProperty('--glare-x', `${(px + 0.5) * 100}%`);
      card.style.setProperty('--glare-y', `${(py + 0.5) * 100}%`);
    });
    document.addEventListener('mouseout', (e) => {
      const card = e.target.closest('.tilting');
      if (card && !card.contains(e.relatedTarget)) resetTilt(card);
    });
    function resetTilt(el) {
      el.classList.remove('tilting');
      el.style.transform = '';
    }
  }

  /* ============================================================
     首页视差：Logo 与丝带随目光轻轻漂移
     ============================================================ */
  function initParallax() {
    const landing = document.querySelector('.landing');
    if (!landing) return;
    let tx = 0, ty = 0, cx = 0, cy = 0;
    document.addEventListener('mousemove', (e) => {
      tx = e.clientX / window.innerWidth - 0.5;
      ty = e.clientY / window.innerHeight - 0.5;
    });
    (function tick() {
      cx += (tx - cx) * 0.04;
      cy += (ty - cy) * 0.04;
      const logo = document.querySelector('.landing-logo');
      if (logo && isViewActive('landing')) {
        logo.style.translate = `${cx * 18}px ${cy * 14}px`;
      }
      document.querySelectorAll('.ribbon-svg').forEach((r, i) => {
        const f = (i + 1) * 10;
        r.style.translate = `${cx * f}px ${cy * f * 0.6}px`;
      });
      requestAnimationFrame(tick);
    })();
  }

  /* ============================================================
     滚动显现：内容从雾里浮上来
     ============================================================ */
  function initScrollReveal() {
    /* 改造：去掉加载即播的动画，换成滚动触发 */
    const quote = document.querySelector('.landing-quote');
    const features = document.querySelectorAll('.feature-card');
    const cta = document.querySelector('#view-landing .text-center');

    if (quote) { quote.classList.remove('anim-fade-up', 'delay-5'); quote.classList.add('reveal'); }
    const featBox = document.querySelector('.features');
    if (featBox) featBox.classList.remove('stagger');
    features.forEach((f, i) => {
      f.classList.add('reveal');
      f.style.transitionDelay = `${i * 0.12}s`;
    });
    if (cta) cta.classList.add('reveal');

    const io = new IntersectionObserver((entries) => {
      entries.forEach(en => {
        if (en.isIntersecting) {
          en.target.classList.add('revealed');
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.18 });

    document.querySelectorAll('.reveal').forEach(el => io.observe(el));
  }

  /* ============================================================
     雾中丝带：截图里那种粉紫色的流动雾带
     ============================================================ */
  function initRibbons() {
    const landing = document.querySelector('.landing');
    if (!landing) return;
    const mk = (cls, d, width, blur, opacity) => {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('viewBox', '0 0 1440 320');
      svg.setAttribute('preserveAspectRatio', 'none');
      svg.classList.add('ribbon-svg', cls);
      svg.innerHTML = `
        <defs>
          <linearGradient id="rg-${cls}" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"  stop-color="#FF8FB8" stop-opacity="0"/>
            <stop offset="35%" stop-color="#FF8FB8" stop-opacity="0.7"/>
            <stop offset="65%" stop-color="#B197FC" stop-opacity="0.7"/>
            <stop offset="100%" stop-color="#7C5CFF" stop-opacity="0"/>
          </linearGradient>
        </defs>
        <path d="${d}" fill="none" stroke="url(#rg-${cls})"
              stroke-width="${width}" stroke-linecap="round"
              style="filter: blur(${blur}px);"/>
      `;
      svg.style.opacity = opacity;
      landing.appendChild(svg);
      return svg;
    };
    mk('r1', 'M-60,210 C260,110 520,270 800,190 S1260,90 1520,190', 30, 16, 0.5);
    mk('r2', 'M-60,150 C300,230 560,90 860,170 S1300,240 1520,140', 18, 8, 0.35);
    mk('r3', 'M-60,260 C240,200 620,300 900,240 S1280,160 1520,240', 8, 2.5, 0.28);
  }

  /* ============================================================
     ⌘K 寻梦：在雾中翻找任何一个梦
     ============================================================ */
  let searchEl = null;
  let searchIdx = 0;

  function initSearch() {
    searchEl = document.createElement('div');
    searchEl.className = 'search-overlay';
    searchEl.id = 'dreamSearch';
    searchEl.innerHTML = `
      <div class="search-box">
        <div class="search-input-row">
          <span class="search-icon">✦</span>
          <input id="searchInput" type="text" placeholder="在梦里找一找…" autocomplete="off">
          <span class="search-kbd">esc</span>
        </div>
        <div class="search-results" id="searchResults"></div>
        <div class="search-foot">
          <span>↑↓ 移动</span><span>⏎ 打开</span><span>⌘K 随时回来</span>
        </div>
      </div>
    `;
    document.body.appendChild(searchEl);

    const input = searchEl.querySelector('#searchInput');
    const results = searchEl.querySelector('#searchResults');

    input.addEventListener('input', () => { searchIdx = 0; renderSearch(input.value, results); });
    input.addEventListener('keydown', (e) => {
      const items = results.querySelectorAll('.search-item');
      if (e.key === 'ArrowDown') { e.preventDefault(); searchIdx = Math.min(searchIdx + 1, items.length - 1); highlightSearch(items); }
      if (e.key === 'ArrowUp')   { e.preventDefault(); searchIdx = Math.max(searchIdx - 1, 0); highlightSearch(items); }
      if (e.key === 'Enter' && items[searchIdx]) { e.preventDefault(); items[searchIdx].click(); }
    });
    searchEl.addEventListener('click', (e) => {
      if (e.target === searchEl) closeSearch();
    });
  }

  function renderSearch(q, results) {
    const dreams = Storage.getDreams();
    if (!q || !q.trim()) {
      results.innerHTML = dreams.slice(0, 5).map(d => searchItemHtml(d)).join('')
        || '<div class="search-empty">还没有梦可以被寻找</div>';
    } else {
      const kw = q.trim().toLowerCase();
      const scored = dreams.map(d => {
        let s = 0;
        if ((d.title || '').toLowerCase().includes(kw)) s += 3;
        (d.tags || []).forEach(t => { if (t.toLowerCase().includes(kw)) s += 2; });
        if ((d.body || '').toLowerCase().includes(kw)) s += 1;
        return { d, s };
      }).filter(x => x.s > 0).sort((a, b) => b.s - a.s).slice(0, 8);
      results.innerHTML = scored.length
        ? scored.map(x => searchItemHtml(x.d, kw)).join('')
        : '<div class="search-empty">这个片段还没有出现在任何梦里</div>';
    }
    const items = results.querySelectorAll('.search-item');
    items.forEach(it => {
      it.addEventListener('click', () => {
        closeSearch();
        Dreams.renderDetail(it.dataset.id);
        App.go('detail', { word: '找到了…' });
      });
    });
    highlightSearch(items);
  }

  function searchItemHtml(d, kw) {
    let excerpt = escapeHtmlLite((d.body || '').slice(0, 60));
    if (kw) {
      const ekw = escapeHtmlLite(kw);
      const i = excerpt.toLowerCase().indexOf(ekw.toLowerCase());
      if (i >= 0) {
        excerpt = excerpt.slice(0, i) + '<mark>' + excerpt.slice(i, i + ekw.length) + '</mark>' + excerpt.slice(i + ekw.length);
      }
    }
    return `
      <div class="search-item" data-id="${escapeHtmlLite(d.id)}">
        <span class="si-mood" style="background:${Utils.moodColor(d.mood)}"></span>
        <div class="si-main">
          <div class="si-title">${escapeHtmlLite(d.title || '未命名的梦')}</div>
          <div class="si-excerpt">${excerpt}</div>
        </div>
        <span class="si-date">${Utils.fmtDate(d.createdAt)}</span>
      </div>
    `;
  }

  function highlightSearch(items) {
    items.forEach((it, i) => it.classList.toggle('is-hl', i === searchIdx));
    if (items[searchIdx]) items[searchIdx].scrollIntoView({ block: 'nearest' });
  }

  function openSearch() {
    searchEl.classList.add('is-open');
    const input = searchEl.querySelector('#searchInput');
    input.value = '';
    searchIdx = 0;
    renderSearch('', searchEl.querySelector('#searchResults'));
    setTimeout(() => input.focus(), 120);
  }
  function closeSearch() { searchEl.classList.remove('is-open'); }
  function isSearchOpen() { return searchEl.classList.contains('is-open'); }

  /* ============================================================
     现实检验气泡：偶尔浮上来问一句——你在做梦吗？
     ============================================================ */
  function initRealityBubble() {
    let bubble = null;
    let timer = null;

    function schedule() {
      clearTimeout(timer);
      timer = setTimeout(maybeSpawn, 60000 + Math.random() * 60000);
    }

    function maybeSpawn() {
      schedule();
      if (bubble) return;
      if (!isViewActive('dashboard')) return;
      if (!Storage.getSettings().moonAlert) return;

      bubble = document.createElement('div');
      bubble.className = 'reality-bubble';
      bubble.innerHTML = '<span class="rb-ring"></span><span class="rb-text">你现在，在做梦吗？</span>';
      document.body.appendChild(bubble);
      requestAnimationFrame(() => bubble.classList.add('is-up'));

      const dismiss = (pop) => {
        if (!bubble) return;
        const b = bubble;
        bubble = null;
        if (pop) {
          const r = b.getBoundingClientRect();
          Starfield.burst(r.left + r.width / 2, r.top + r.height / 2);
          toast(REALITY_TIPS[Math.floor(Math.random() * REALITY_TIPS.length)], 5200);
        }
        b.classList.remove('is-up');
        b.classList.add('is-pop');
        setTimeout(() => b.remove(), 700);
      };

      bubble.addEventListener('click', () => dismiss(true));
      setTimeout(() => dismiss(false), 14000);
    }

    schedule();
  }

  /* ============================================================
     顶部圆点：关窗=回岸边 · 黄灯=小睡 · 绿灯=全屏
     ============================================================ */
  function initChromeDots() {
    const dots = document.querySelectorAll('.chrome-dot');
    if (dots.length < 3) return;
    const [red, yellow, green] = dots;
    red.classList.add('dot-red');
    yellow.classList.add('dot-yellow');
    green.classList.add('dot-green');
    red.title = '回到岸边';
    yellow.title = '小睡片刻';
    green.title = '铺满夜空';

    red.style.cursor = yellow.style.cursor = green.style.cursor = 'pointer';

    red.addEventListener('click', () => App.go('landing', { word: '回到岸边…' }));
    yellow.addEventListener('click', enterDoze);
    green.addEventListener('click', () => {
      if (document.fullscreenElement) document.exitFullscreen();
      else document.documentElement.requestFullscreen().catch(() => {});
    });
  }

  /* ---- 打盹模式：整个房间陪你一起呼吸 ---- */
  function enterDoze() {
    if (document.getElementById('dozeOverlay')) return;
    const o = document.createElement('div');
    o.id = 'dozeOverlay';
    o.className = 'doze-overlay';
    o.innerHTML = `
      <div class="doze-moon">${Moon.renderSVG(Utils.moonPhase().phaseValue, 110)}</div>
      <p class="doze-text">正在小睡…</p>
      <span class="doze-hint">点击任意处，醒来</span>
    `;
    document.body.appendChild(o);
    requestAnimationFrame(() => o.classList.add('is-on'));
    o.addEventListener('click', () => {
      o.classList.remove('is-on');
      setTimeout(() => o.remove(), 900);
    });
  }

  /* ============================================================
     快捷键：像梦一样不留痕迹地移动
     ============================================================ */
  function initShortcuts() {
    document.addEventListener('keydown', (e) => {
      const typing = /^(INPUT|TEXTAREA)$/.test(document.activeElement?.tagName || '');

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        isSearchOpen() ? closeSearch() : openSearch();
        return;
      }
      if (e.key === 'Escape') {
        if (isSearchOpen()) { closeSearch(); return; }
        const doze = document.getElementById('dozeOverlay');
        if (doze) { doze.click(); return; }
        if (isViewActive('write') || isViewActive('detail') ||
            isViewActive('insights') || isViewActive('settings')) {
          App.go('dashboard');
        }
        return;
      }
      if (typing) return;

      if (e.key === '/') {
        e.preventDefault();
        openSearch();
        return;
      }
      if (e.key.toLowerCase() === 'n' && isViewActive('dashboard')) {
        App.go('write', { word: '新的一夜…' });
      }
    });
  }

  /* ============================================================
     灵感提词：写不下去时，让它轻轻推你一下
     ============================================================ */
  function initPromptButton() {
    const canvas = document.querySelector('.write-canvas');
    if (!canvas) return;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'prompt-btn';
    btn.innerHTML = '✦ 给我一个提示';
    canvas.appendChild(btn);

    btn.addEventListener('click', () => {
      const ta = document.getElementById('writeBody');
      const p = PROMPTS[Math.floor(Math.random() * PROMPTS.length)];
      const insert = (ta.value && !ta.value.endsWith('\n') ? '\n' : '') + p + '\n';
      const pos = ta.selectionStart ?? ta.value.length;
      ta.value = ta.value.slice(0, pos) + insert + ta.value.slice(pos);
      ta.dispatchEvent(new Event('input'));
      ta.focus();
      ta.selectionStart = ta.selectionEnd = pos + insert.length;
      /* 按钮轻闪 */
      btn.animate([
        { filter: 'brightness(1)' },
        { filter: 'brightness(1.8)' },
        { filter: 'brightness(1)' },
      ], { duration: 600 });
    });
  }

  /* ============================================================
     轻提示 Toast：从雾里来，回雾里去
     ============================================================ */
  function toast(msg, ms = 3600) {
    let t = document.getElementById('magicToast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'magicToast';
      t.className = 'magic-toast';
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.classList.add('is-on');
    clearTimeout(t._timer);
    t._timer = setTimeout(() => t.classList.remove('is-on'), ms);
  }

  /* ---- 工具 ---- */
  function isViewActive(name) {
    const v = document.querySelector(`[data-view="${name}"]`);
    return v && v.classList.contains('is-active');
  }
  function escapeHtmlLite(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  return { init, toast, openSearch };
})();

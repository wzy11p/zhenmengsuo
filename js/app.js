/* ============================================================
   枕梦索 · 主应用 / 路由 / 全局动效绑定
   ============================================================ */

const App = (() => {
  let lastView = null;
  let routeVersion = 0;

  function init() {
    /* 启动星空 */
    Starfield.init();
    DreamMotes.init();

    /* 入梦转场 */
    Veil.init();

    /* 魔法交互包 */
    Magic.init();

    /* 全局路由点击 */
    document.body.addEventListener('click', (e) => {
      const goEl = e.target.closest('[data-go]');
      if (goEl) {
        e.preventDefault();
        const target = goEl.dataset.go;
        go(target);
      }
    });

    /* 跳过引导 */
    document.body.addEventListener('click', (e) => {
      if (e.target.closest('[data-skip]')) {
        try { Storage.setUser({ name: Storage.getUser().name || '朋友' }); Storage.markOnboarded(); }
        catch (error) { alert(error.message); return; }
        go('dashboard');
      }
    });

    /* 鼠标光晕 */
    initCursorGlow();

    /* 写页面按钮 */
    initWritePage();

    /* 设置页 */
    initSettingsBindings();

    /* 初始化主题 */
    const user = Storage.getUser();
    Utils.applyTheme(user.theme || 'night');

    /* 启动判断 */
    const hashView = (location.hash || '').replace('#', '');
    const validViews = ['landing', 'dashboard', 'write', 'insights', 'settings', 'onboarding'];
    if (validViews.includes(hashView)) {
      setTimeout(() => go(hashView), 100);
    }
    // URL 不会注入示例或清空日记；只在用户明确操作时写入数据。
    Dreams.restoreDraft();
    window.addEventListener('beforeunload', e => {
      if (Voice.isRecording() || Dreams.hasChanges()) { e.preventDefault(); e.returnValue = ''; }
    });
    document.body.addEventListener('keydown', e => {
      if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('.dream-card')) {
        e.preventDefault(); e.target.click();
      }
    });

    /* 字符级渐入：所有 .h-display 标题 */
    splitTitles();
  }

  /* 首页淡入后，让用户主动开始 */
  function showLandingThenRedirect() {
    /* 保持 landing view 在激活状态 */
  }

  /* ---- 路由 ---- */
  function go(name, options = {}) {
    if (Voice.isRecording()) { alert('请先结束录音，等声音整理完成后再离开。'); return; }
    const request = ++routeVersion;
    const doShow = () => {
      if (request !== routeVersion) return;
      if (name !== lastView) Voice.stopPlayback();
      if (name === 'onboarding') {
        Onboarding.start();
      }
      /* 进入 dashboard 时拉取每日一句 */
      if (name === 'dashboard' && !options.skipTip) {
        const tipEl = document.getElementById('dailyTip');
        if (tipEl) tipEl.textContent = Storage.nextTip();
      }
      Views.show(name, options);
      lastView = name;
    };
    /* 入梦转场：雾最浓的一瞬换页 */
    if (options.instant) { doShow(); return; }
    Veil.run(doShow, { word: options.word });
  }

  /* 刷新当前视图（不切换） */
  function refresh(name) {
    Views.show(name);
  }

  /* ---- 鼠标光晕 ---- */
  function initCursorGlow() {
    const glow = document.getElementById('cursorGlow');
    if (!glow) return;
    let mx = window.innerWidth / 2;
    let my = window.innerHeight / 2;
    let cx = mx, cy = my;
    document.addEventListener('mousemove', (e) => { mx = e.clientX; my = e.clientY; });
    /* 点击时爆发星尘 */
    document.addEventListener('click', (e) => {
      Starfield.burst(e.clientX, e.clientY);
    });
    function animate() {
      cx += (mx - cx) * 0.15;
      cy += (my - cy) * 0.15;
      glow.style.left = cx + 'px';
      glow.style.top = cy + 'px';
      requestAnimationFrame(animate);
    }
    animate();

    /* 在按钮上时光晕变亮 */
    document.body.addEventListener('mouseover', (e) => {
      const btn = e.target.closest('.btn, .option-row, .card, .nav button');
      glow.style.opacity = btn ? '1' : '0.6';
      glow.style.transform = btn
        ? 'translate(-50%, -50%) scale(1.4)'
        : 'translate(-50%, -50%) scale(1)';
    });
  }

  /* ---- 写梦境页 ---- */
  function initWritePage() {
    const clarity = document.getElementById('writeClarity');
    const clarityValue = document.getElementById('clarityValue');
    const update = () => {
      const v = clarity.value;
      clarity.style.setProperty('--val', v + '%');
      clarityValue.textContent = v + '%';
    };
    clarity.addEventListener('input', update);
    update();

    /* 情绪选择 */
    document.querySelectorAll('.mood-pill').forEach(p => {
      p.addEventListener('click', () => {
        const wasSelected = p.classList.contains('is-selected');
        document.querySelectorAll('.mood-pill').forEach(x => x.classList.remove('is-selected'));
        if (!wasSelected) {
          p.classList.add('is-selected');
          /* 微动效 */
          p.animate([
            { transform: 'scale(1)' },
            { transform: 'scale(1.1)' },
            { transform: 'scale(1)' },
          ], { duration: 360, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' });
        }
      });
    });

    /* 标签输入 */
    const tagInput = document.getElementById('writeTagInput');
    tagInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.isComposing) {
        e.preventDefault();
        Dreams.addTag(tagInput.value);
        tagInput.value = '';
      }
    });

    /* 保存按钮 */
    document.getElementById('writeSave').addEventListener('click', () => Dreams.saveWriteForm());
    document.getElementById('writeDraft').addEventListener('click', () => {
      Dreams.saveDraft();
    });

    /* 输入框聚焦时金色光环 */
    document.querySelectorAll('.write-canvas textarea, .write-title-input').forEach(el => {
      el.addEventListener('focus', () => {
        el.parentElement?.classList.add('focused');
      });
      el.addEventListener('blur', () => {
        el.parentElement?.classList.remove('focused');
      });
    });

    /* 字数呼吸提示 */
    const bodyEl = document.getElementById('writeBody');
    const countEl = document.getElementById('writeCount');
    const updateCount = () => {
      const n = bodyEl.value.trim().length;
      countEl.textContent = n > 0 ? `${n} 字` : '';
    };
    bodyEl.addEventListener('input', updateCount);

    /* 语音拾梦 */
    initVoice();
  }

  /* ---- 语音拾梦绑定 ---- */
  function initVoice() {
    const orb = document.getElementById('voiceOrb');
    const label = document.getElementById('voiceLabel');
    const hint = document.getElementById('voiceHint');
    const timeEl = document.getElementById('voiceTime');
    const wave = document.getElementById('voiceWave');
    const row = document.getElementById('voiceRow');
    if (!orb) return;

    if (!Voice.supported()) {
      orb.disabled = true;
      hint.textContent = '此浏览器暂不支持录音，请先用文字记录。';
      return;
    }
    const lockSave = value => {
      document.getElementById('writeSave').disabled = value;
      document.getElementById('writeDraft').disabled = value;
    };
    const reset = () => {
      orb.disabled = false;
      orb.classList.remove('is-recording');
      orb.setAttribute('aria-label', '开始录音');
      orb.setAttribute('aria-pressed', 'false');
      wave.classList.remove('is-live');
      label.textContent = '语音拾梦';
      lockSave(false);
    };
    orb.addEventListener('click', async () => {
      if (Voice.isRecording()) { await Voice.stop(); return; }
      if (Voice.getPending() && !confirm('重新录制会替换待保存的声音，继续吗？')) return;
      await Voice.start({
        onWaiting: () => {
          lockSave(true);
          label.textContent = '等待麦克风…';
          hint.textContent = '请在浏览器中允许录音，再点光球可取消。';
        },
        onStart: () => {
          orb.classList.add('is-recording');
          orb.setAttribute('aria-label', '结束录音');
          orb.setAttribute('aria-pressed', 'true');
          wave.classList.add('is-live');
          label.textContent = '正在聆听…';
          hint.textContent = '再点一下结束 · 最长 2 分钟 · 切到后台会结束录音';
          timeEl.textContent = '0:00';
        },
        onFinishing: () => { orb.disabled = true; lockSave(true); label.textContent = '正在整理声音…'; },
        onStop: () => {
          reset();
          hint.textContent = '声音还未保存，点“保存梦境”或“存为草稿”把它留下。';
          Dreams.renderVoiceClipArea();
        },
        onTick: sec => { timeEl.textContent = Voice.fmtTime(sec); },
        onLevel: level => { orb.style.setProperty('--level', level.toFixed(2)); },
        onError: msg => { reset(); hint.textContent = msg; },
      });
    });
  }

  /* ---- 设置页绑定 ---- */
  function initSettingsBindings() {
    /* 名字保存 */
    document.getElementById('saveName').addEventListener('click', () => {
      const name = document.getElementById('settingName').value.trim() || '朋友';
      try { Storage.setUser({ name }); } catch (error) { alert(error.message); return; }
      /* 微反馈 */
      const btn = document.getElementById('saveName');
      btn.textContent = '已保存 ✦';
      btn.animate([
        { transform: 'scale(1)' },
        { transform: 'scale(1.05)' },
        { transform: 'scale(1)' },
      ], { duration: 400 });
      setTimeout(() => { btn.textContent = '保存'; }, 1500);
    });

    /* 开关 */
    document.querySelectorAll('.toggle').forEach(t => {
      t.addEventListener('click', () => {
        const key = t.dataset.toggle;
        if (t.getAttribute('aria-disabled') === 'true') return;
        const next = !t.classList.contains('is-on');
        try { Storage.setSetting(key, next); } catch (error) { alert(error.message); return; }
        t.classList.toggle('is-on');
        t.setAttribute('aria-checked', String(next));
        /* 涟漪 */
        const r = document.createElement('span');
        r.style.cssText = `
          position: absolute; top: 50%; left: ${next ? '21px' : '3px'};
          width: 30px; height: 30px; border-radius: 50%;
          background: radial-gradient(circle, rgba(124,92,255,0.6), transparent);
          transform: translate(-50%, -50%);
          pointer-events: none;
        `;
        t.appendChild(r);
        r.animate([
          { opacity: 1, transform: 'translate(-50%, -50%) scale(0.5)' },
          { opacity: 0, transform: 'translate(-50%, -50%) scale(2.5)' },
        ], { duration: 700 }).onfinish = () => r.remove();
      });
    });

    /* 主题选择 */
    document.querySelectorAll('.theme-chip').forEach(c => {
      c.addEventListener('click', () => {
        const theme = c.dataset.theme;
        try { Storage.setUser({ theme }); } catch (error) { alert(error.message); return; }
        document.querySelectorAll('.theme-chip').forEach(x => x.classList.remove('is-active'));
        c.classList.add('is-active');
        Utils.applyTheme(theme);
        /* 主题切换的过场 */
        document.body.animate([
          { filter: 'blur(0)' },
          { filter: 'blur(8px)', opacity: 0.5 },
          { filter: 'blur(0)', opacity: 1 },
        ], { duration: 600 });
      });
    });

    /* 导出 */
    document.getElementById('exportBtn').addEventListener('click', () => {
      const data = {
        user: Storage.getUser(),
        dreams: Storage.getDreams(),
        draft: Storage.getDraft(),
        settings: Storage.getSettings(),
        exportedAt: new Date().toISOString(),
      };
      if (Storage.dreamReadError) {
        try { data.unreadableDreams = localStorage.getItem(Storage.KEYS.DREAMS); }
        catch { alert('浏览器禁止读取数据，暂时无法导出。'); return; }
      }
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `枕梦索-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    });

    /* 清除 */
    document.getElementById('clearBtn').addEventListener('click', () => {
      if (confirm('这会永久删除这个浏览器里的所有梦境和草稿，无法撤销。请先导出备份。确定吗？')) {
        try { Storage.requireSet(Storage.KEYS.DREAMS, []); Storage.clearDraft(); }
        catch (error) { alert(error.message); return; }
        Dreams.clearWriteForm();
        go('dashboard');
      }
    });
  }

  /* ---- 字符级拆字 ---- */
  function splitTitles() {
    document.querySelectorAll('.split-title').forEach(el => {
      const text = el.textContent;
      el.innerHTML = '';
      Array.from(text).forEach((ch, i) => {
        const span = document.createElement('span');
        span.className = 'char-fade';
        span.textContent = ch;
        span.style.animationDelay = `${0.05 * i}s`;
        el.appendChild(span);
      });
    });
  }

  /* ---- 启动 ---- */
  return {
    init,
    go,
    refresh,
  };
})();

/* DOM Ready */
window.addEventListener('error', function (e) {
  window.__bootErr = (e.message || '') + ' @ ' + (e.filename || '') + ':' + (e.lineno || '');
});
try {
  const boot = () => {
    try { App.init(); window.__bootOk = true; }
    catch (err) { window.__bootErr = 'INIT_THROW: ' + (err && err.message) + ' @ ' + ((err && err.stack) || '').split('\n')[1]; }
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
} catch (e) {
  window.__bootErr = 'BOOT_THROW: ' + e.message;
}

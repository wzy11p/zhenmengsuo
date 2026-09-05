/* ============================================================
   枕梦索 · 引导流程
   多步：5 步，迷雾切换，选项星光飞入
   ============================================================ */

const Onboarding = (() => {
  let currentStep = 0;
  let userData = {};
  let selectedSingle = null;
  let selectedMulti = new Set();
  let textValue = '';
  let timeValue = '08:00';
  let transitioning = false;
  const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function render(container) {
    transitioning = false;
    const steps = TIPS.onboarding;
    const total = steps.length;
    const step = steps[currentStep];

    /* 进度条：写入静态 #dreamProgress 容器，附一颗行走的星 */
    const progress = document.getElementById('dreamProgress');
    if (progress) {
      let spans = '';
      for (let i = 0; i < total; i++) {
        spans += `<span class="${i < currentStep ? 'done' : i === currentStep ? 'active' : ''}"></span>`;
      }
      progress.innerHTML = spans + '<span class="pstar">✦</span>';
      progress.style.setProperty('--p', ((currentStep + 0.5) / total).toFixed(3));
    }

    /* 返回时恢复已保存的选择状态 */
    if (step.type === 'choice' && userData[step.field]) {
      const idx = step.options.findIndex(o => o.l === userData[step.field]);
      if (idx >= 0) selectedSingle = { idx, value: userData[step.field] };
    }
    if (step.type === 'multi' && Array.isArray(userData[step.field])) {
      selectedMulti = new Set(userData[step.field]);
    }

    /* 步骤主体 */
    let body = '';
    if (step.type === 'text') {
      body = renderText(step);
    } else if (step.type === 'choice') {
      body = renderChoice(step);
    } else if (step.type === 'multi') {
      body = renderMulti(step);
    } else if (step.type === 'time') {
      body = renderTime(step);
    } else if (step.type === 'finish') {
      body = renderFinish(step);
    }

    /* 操作按钮 */
    const actionLabel = step.type === 'finish' ? '进入梦境殿堂 ✦' : '继续';

    container.innerHTML = `
      <div class="onboarding onb-step is-active" id="onbStep">
        <h2 class="onb-question">${step.q}</h2>
        ${step.sub ? `<p class="onb-hint">${step.sub}</p>` : ''}
        ${body}
        <div class="onb-actions">
          ${currentStep > 0 ? '<button class="btn btn-ghost" id="onbBack">← 上一步</button>' : ''}
          <button class="btn btn-primary btn-arrow" id="onbNext" ${canProceed(step) ? '' : 'disabled'}>
            ${actionLabel}
          </button>
        </div>
      </div>
    `;
    bind(container, step);
  }

  function renderText(step) {
    return `
      <div class="onb-text-step">
        <div class="input-wrap">
          <input type="text" id="onbInput" placeholder="${step.placeholder || ''}"
                 value="${escape(textValue)}" maxlength="40" autocomplete="off">
        </div>
      </div>
    `;
  }

  function renderChoice(step) {
    return `<div class="onb-options stagger">
      ${step.options.map((o, i) => `
        <div class="option-row ${selectedSingle && selectedSingle.idx === i ? 'is-selected' : ''}"
             data-idx="${i}" data-field="${step.field}">
          <span class="opt-emoji">${o.e}</span>
          <div class="opt-label">
            ${o.l}
            ${o.s ? `<span class="opt-sub">${o.s}</span>` : ''}
          </div>
          <div class="opt-radio"></div>
        </div>
      `).join('')}
    </div>`;
  }

  function renderMulti(step) {
    return `<div class="onb-options stagger">
      ${step.options.map((o, i) => `
        <div class="option-row ${selectedMulti.has(o.l) ? 'is-selected' : ''}"
             data-idx="${i}" data-field="${step.field}">
          <span class="opt-emoji">${o.e}</span>
          <div class="opt-label">
            ${o.l}
            ${o.s ? `<span class="opt-sub">${o.s}</span>` : ''}
          </div>
          <div class="opt-radio"></div>
        </div>
      `).join('')}
    </div>`;
  }

  function renderTime(step) {
    return `
      <div class="onb-text-step">
        <p class="dim" style="margin-bottom: 12px;">默认是早上 8 点。如果你有自己偏好的时间，改一下就好。</p>
        <div class="input-wrap" style="max-width: 280px;">
          <input type="time" id="onbTime" value="${timeValue}">
        </div>
      </div>
    `;
  }

  function renderFinish(step) {
    const name = escape(userData.name || '朋友');
    return `
      <div class="text-center mt-8" style="animation: fade-up 1.2s var(--ease-dream);">
        <img src="assets/logo.jpg" alt="枕梦索" class="onb-logo"
             style="width: 130px; height: 130px; border-radius: 32px; margin: 0 auto 28px;
                    animation: float 4s var(--ease-float) infinite;
                    filter: drop-shadow(0 0 40px rgba(157, 128, 255, 0.6));">
        <h2 class="h-2" style="margin-bottom: 16px;">${name}，准备好了</h2>
        <p class="body-text" style="max-width: 460px; margin: 0 auto;">
          今晚开始，每一个梦都会被你轻轻留住。<br>
          它们不会消失，只会在合适的时候浮上来。
        </p>
      </div>
    `;
  }

  function canProceed(step) {
    if (step.type === 'text') return textValue.trim().length > 0;
    if (step.type === 'choice') return !!selectedSingle;
    if (step.type === 'multi') return selectedMulti.size > 0;
    if (step.type === 'time') return !!timeValue;
    return true;
  }

  function bind(container, step) {
    const next = container.querySelector('#onbNext');
    const back = container.querySelector('#onbBack');

    if (next) next.addEventListener('click', () => next_());
    if (back) back.addEventListener('click', () => back_(container));

    /* 文本输入 */
    if (step.type === 'text') {
      const inp = container.querySelector('#onbInput');
      inp?.focus();
      inp?.addEventListener('input', (e) => {
        textValue = e.target.value;
        next.disabled = !canProceed(step);
      });
    }

    /* 时间选择 */
    if (step.type === 'time') {
      const inp = container.querySelector('#onbTime');
      inp?.addEventListener('change', (e) => {
        timeValue = e.target.value;
        next.disabled = !canProceed(step);
      });
    }

    /* 选项 */
    if (step.type === 'choice' || step.type === 'multi') {
      const rows = container.querySelectorAll('.option-row');
      rows.forEach((row, i) => {
        row.addEventListener('click', () => {
          const idx = parseInt(row.dataset.idx, 10);
          const opt = step.options[idx];

          if (step.type === 'choice') {
            rows.forEach(r => r.classList.remove('is-selected'));
            row.classList.add('is-selected');
            selectedSingle = { idx, value: opt.l, emoji: opt.e };
            /* 飞行星点 */
            spawnFlyingStar(row);
          } else {
            row.classList.toggle('is-selected');
            if (row.classList.contains('is-selected')) {
              selectedMulti.add(opt.l);
              spawnFlyingStar(row);
            } else {
              selectedMulti.delete(opt.l);
            }
          }
          next.disabled = !canProceed(step);
        });
      });
    }
  }

  function spawnFlyingStar(row) {
    const star = document.createElement('span');
    star.textContent = '✦';
    Object.assign(star.style, {
      position: 'absolute',
      right: '32px',
      top: '50%',
      fontSize: '16px',
      color: 'var(--violet-glow)',
      pointerEvents: 'none',
      filter: 'drop-shadow(0 0 8px rgba(157, 128, 255, 0.8))',
    });
    row.appendChild(star);
    star.animate([
      { transform: 'translate(0, -50%) scale(1)', opacity: 1 },
      { transform: 'translate(40px, -200px) scale(1.5)', opacity: 0 },
    ], { duration: 1000, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' }).onfinish = () => star.remove();
  }

  function next_() {
    const step = TIPS.onboarding[currentStep];
    if (transitioning || !canProceed(step)) return;
    transitioning = true;

    /* 保存数据 */
    if (step.type === 'text') userData[step.field] = textValue.trim();
    if (step.type === 'choice') userData[step.field] = selectedSingle.value;
    if (step.type === 'multi')  userData[step.field] = Array.from(selectedMulti);
    if (step.type === 'time')   userData.reminderTime = timeValue;

    if (currentStep === TIPS.onboarding.length - 1) {
      /* 完成引导 */
      try { Storage.setUser({
        ...userData,
        reminderTime: timeValue,
      }); Storage.markOnboarded(); }
      catch (error) { transitioning = false; alert(error.message); return; }
      completeOnboard();
      return;
    }

    /* 切换步骤 - 迷雾溶解 */
    const container = document.getElementById('onboardingContainer');
    const currentEl = container.querySelector('#onbStep');
    currentEl.style.animation = 'mist-dissolve 600ms var(--ease-dream) forwards';

    setTimeout(() => {
      currentStep++;
      selectedSingle = null;
      render(container);
    }, 580);
  }

  function back_(container) {
    if (transitioning || currentStep <= 0) return;
    transitioning = true;
    const currentEl = container.querySelector('#onbStep');
    currentEl.style.animation = 'mist-dissolve 500ms var(--ease-dream) forwards';
    setTimeout(() => {
      currentStep--;
      const prev = TIPS.onboarding[currentStep];
      /* 恢复之前的数据（选择态由 render 根据 userData 重建） */
      if (prev.type === 'text') textValue = userData[prev.field] || '';
      if (prev.type === 'time') timeValue = userData.reminderTime || '08:00';
      render(container);
    }, 480);
  }

  function completeOnboard() {
    /* 完成庆祝动效 */
    const container = document.getElementById('onboardingContainer');
    container.style.transition = 'opacity 0.8s var(--ease-dream), transform 0.8s var(--ease-dream)';
    container.style.opacity = '0';
    container.style.transform = 'scale(0.96)';

    /* 触发流星雨 */
    for (let i = 0; i < 5; i++) {
      setTimeout(() => Starfield.maybeShootingStar(), i * 200);
    }

    setTimeout(() => App.go('dashboard', { delay: 200 }), 700);
  }

  function start() {
    currentStep = 0;
    userData = {};
    selectedSingle = null;
    selectedMulti = new Set();
    textValue = '';
    timeValue = '08:00';
    const container = document.getElementById('onboardingContainer');
    container.style.opacity = '';
    container.style.transform = '';
    render(container);
  }

  return { start };
})();

/* ============================================================
   枕梦索 · 月相渲染
   8 种月相预制 path,稳定准确
   ============================================================ */

const Moon = (() => {
  /* 每个 phase bucket 对应的可视区域 path */
  /* cx=60, cy=60, r=36, 描边月亮从顶部开始 */
  function buildPath(leftCurve, rightCurve) {
    /* leftCurve / rightCurve: 内部椭圆 rx, 0=直线, r=36=半圆 */
    const r = 36, cx = 60, cy = 60;
    /* 公共 path：从顶部开始，右半圆，再回到顶部 */
    return `M ${cx} ${cy - r}
            A ${r} ${r} 0 0 1 ${cx} ${cy + r}
            A ${rightCurve} ${r} 0 0 1 ${cx} ${cy - r} Z`;
  }

  function reversePath(leftCurve, rightCurve) {
    const r = 36, cx = 60, cy = 60;
    /* 反向：左半圆 + 右椭圆 */
    return `M ${cx} ${cy - r}
            A ${rightCurve} ${r} 0 0 0 ${cx} ${cy + r}
            A ${r} ${r} 0 0 0 ${cx} ${cy - r} Z`;
  }

  const PHASES = {
    /* 新月 - 不可见 */
    new: () => '',
    /* 蛾眉月 - 右侧窄月牙 */
    waxing_crescent: () => {
      const r = 36;
      /* 从顶部右半圆到下部,用一个小椭圆回到顶部 */
      return `M ${60} ${60 - r}
              A ${r} ${r} 0 0 1 ${60} ${60 + r}
              A 12 ${r} 0 0 1 ${60} ${60 - r} Z`;
    },
    /* 上弦月 - 右半圆 */
    first_quarter: () => {
      const r = 36;
      return `M ${60} ${60 - r}
              A ${r} ${r} 0 0 1 ${60} ${60 + r}
              L ${60} ${60 - r} Z`;
    },
    /* 盈凸月 - 大部分亮,左侧窄阴影 */
    waxing_gibbous: () => {
      const r = 36;
      return `M ${60} ${60 - r}
              A ${r} ${r} 0 0 1 ${60} ${60 + r}
              A 22 ${r} 0 0 0 ${60} ${60 - r} Z`;
    },
    /* 满月 - 完整圆 */
    full: () => {
      const r = 36;
      return `M ${60} ${60 - r}
              A ${r} ${r} 0 1 1 ${60} ${60 + r}
              A ${r} ${r} 0 1 1 ${60} ${60 - r} Z`;
    },
    /* 亏凸月 - 大部分亮,右侧窄阴影 */
    waning_gibbous: () => {
      const r = 36;
      return `M ${60} ${60 - r}
              A ${r} ${r} 0 0 0 ${60} ${60 + r}
              A 22 ${r} 0 0 1 ${60} ${60 - r} Z`;
    },
    /* 下弦月 - 左半圆 */
    last_quarter: () => {
      const r = 36;
      return `M ${60} ${60 - r}
              A ${r} ${r} 0 0 0 ${60} ${60 + r}
              L ${60} ${60 - r} Z`;
    },
    /* 残月 - 左侧窄月牙 */
    waning_crescent: () => {
      const r = 36;
      return `M ${60} ${60 - r}
              A 12 ${r} 0 0 0 ${60} ${60 + r}
              A ${r} ${r} 0 0 0 ${60} ${60 - r} Z`;
    },
  };

  /* 根据 phase 决定使用哪种月相 path */
  function getPath(phase) {
    if (phase < 0.03 || phase > 0.97) return PHASES.new();
    if (phase < 0.22) return PHASES.waxing_crescent();
    if (phase < 0.28) return PHASES.first_quarter();
    if (phase < 0.47) return PHASES.waxing_gibbous();
    if (phase < 0.53) return PHASES.full();
    if (phase < 0.72) return PHASES.waning_gibbous();
    if (phase < 0.78) return PHASES.last_quarter();
    return PHASES.waning_crescent();
  }

  let uidCounter = 0;

  function renderSVG(phase, size = 120) {
    const moonPath = getPath(phase);
    const isInvisible = moonPath === '';
    const uid = ++uidCounter; /* 每次调用唯一，避免同毫秒 id 冲突 */

    return `
      <svg viewBox="0 0 120 120" width="${size}" height="${size}" style="overflow: visible;">
        <defs>
          <radialGradient id="moonG-${uid}" cx="40%" cy="35%">
            <stop offset="0%" stop-color="#F5F2FF"/>
            <stop offset="55%" stop-color="#D6C8FF"/>
            <stop offset="100%" stop-color="#7C5CFF"/>
          </radialGradient>
          <radialGradient id="moonHalo-${uid}" cx="50%" cy="50%">
            <stop offset="0%" stop-color="rgba(157,128,255,0.45)"/>
            <stop offset="60%" stop-color="rgba(157,128,255,0.08)"/>
            <stop offset="100%" stop-color="rgba(157,128,255,0)"/>
          </radialGradient>
          ${isInvisible ? `
          <radialGradient id="moonShadow-${uid}" cx="50%" cy="50%">
            <stop offset="0%" stop-color="rgba(11, 8, 38, 0.6)"/>
            <stop offset="100%" stop-color="rgba(11, 8, 38, 0.95)"/>
          </radialGradient>` : ''}
        </defs>
        <!-- 光晕 -->
        <circle cx="60" cy="60" r="58" fill="url(#moonHalo-${uid})" class="moon-halo" style="animation: moon-shimmer 4s ease-in-out infinite; transform-origin: center;"/>
        <!-- 月亮本体 -->
        ${isInvisible ? `
          <!-- 新月：显示一个深色圆点 -->
          <circle cx="60" cy="60" r="36" fill="url(#moonShadow-${uid})" style="filter: drop-shadow(0 0 12px rgba(157,128,255,0.3));"/>
          <circle cx="60" cy="60" r="36" fill="none" stroke="rgba(157,128,255,0.4)" stroke-width="1" stroke-dasharray="2 3"/>
        ` : `
          <path d="${moonPath}" fill="url(#moonG-${uid})" style="filter: drop-shadow(0 0 18px rgba(199,184,255,0.7));"/>
          <!-- 月坑装饰（仅在月亮足够大时显示） -->
          <circle cx="50" cy="52" r="2.5" fill="rgba(124,92,255,0.3)"/>
          <circle cx="68" cy="64" r="1.8" fill="rgba(124,92,255,0.25)"/>
          <circle cx="58" cy="72" r="1.3" fill="rgba(124,92,255,0.2)"/>
        `}
      </svg>
    `;
  }

  return { renderSVG };
})();
/* ============================================================
   枕梦索 · 星空粒子背景
   多层：尘埃 / 流星 / 极光波动
   ============================================================ */

const Starfield = (() => {
  let canvas, ctx, stars = [], dust = [], shootingStars = [], bursts = [], auroraTime = 0;
  let width, height, dpr;
  let animationId;

  /* 月相（用来决定星星的颜色倾向） */
  const STAR_COLORS = [
    'rgba(255,255,255,',
    'rgba(199,184,255,',
    'rgba(157,128,255,',
    'rgba(255,213,128,',
    'rgba(255,143,184,',
  ];

  function init() {
    canvas = document.getElementById('starfield');
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    resize();
    spawn();
    bind();
    loop();
  }

  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.scale(dpr, dpr);
  }

  function spawn() {
    /* 主星群 */
    const count = Math.min(180, Math.floor((width * height) / 9000));
    stars = [];
    for (let i = 0; i < count; i++) {
      stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        r: Math.random() * 1.4 + 0.2,
        baseAlpha: Math.random() * 0.6 + 0.2,
        phase: Math.random() * Math.PI * 2,
        twinkleSpeed: Math.random() * 0.018 + 0.005,
        color: STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)],
        drift: Math.random() * 0.02 + 0.005,
      });
    }

    /* 尘埃（更小更暗） */
    dust = [];
    for (let i = 0; i < count * 1.5; i++) {
      dust.push({
        x: Math.random() * width,
        y: Math.random() * height,
        r: Math.random() * 0.8 + 0.1,
        alpha: Math.random() * 0.4 + 0.1,
        drift: Math.random() * 0.05 + 0.02,
      });
    }
  }

  function bind() {
    window.addEventListener('resize', () => { resize(); spawn(); });
    /* 每隔 12-18 秒随机触发流星 */
    setInterval(() => { maybeShootingStar(); }, 8000);
  }

  function maybeShootingStar() {
    if (shootingStars.length > 1) return;
    shootingStars.push({
      x: Math.random() * width * 0.6,
      y: Math.random() * height * 0.4,
      vx: 8 + Math.random() * 4,
      vy: 3 + Math.random() * 2,
      life: 0,
      maxLife: 60 + Math.random() * 30,
      length: 80 + Math.random() * 60,
    });
  }

  function loop() {
    auroraTime += 0.005;
    ctx.clearRect(0, 0, width, height);

    drawAurora();
    drawDust();
    drawStars();
    drawShootingStars();
    drawBursts();

    animationId = requestAnimationFrame(loop);
  }

  /* 极光波动（在背景层透出） */
  function drawAurora() {
    const t = auroraTime;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    /* 紫色波 */
    const g1 = ctx.createRadialGradient(
      width * (0.3 + Math.sin(t) * 0.1), height * 0.3, 0,
      width * 0.3, height * 0.3, width * 0.6
    );
    g1.addColorStop(0, 'rgba(124, 92, 255, 0.07)');
    g1.addColorStop(1, 'rgba(124, 92, 255, 0)');
    ctx.fillStyle = g1;
    ctx.fillRect(0, 0, width, height);

    /* 粉色波 */
    const g2 = ctx.createRadialGradient(
      width * (0.7 + Math.cos(t * 0.7) * 0.08), height * (0.7 + Math.sin(t * 0.5) * 0.05), 0,
      width * 0.7, height * 0.7, width * 0.5
    );
    g2.addColorStop(0, 'rgba(255, 143, 184, 0.05)');
    g2.addColorStop(1, 'rgba(255, 143, 184, 0)');
    ctx.fillStyle = g2;
    ctx.fillRect(0, 0, width, height);

    /* 蓝紫 */
    const g3 = ctx.createRadialGradient(
      width * 0.5, height * (0.5 + Math.sin(t * 0.3) * 0.15), 0,
      width * 0.5, height * 0.5, width * 0.7
    );
    g3.addColorStop(0, 'rgba(109, 169, 255, 0.04)');
    g3.addColorStop(1, 'rgba(109, 169, 255, 0)');
    ctx.fillStyle = g3;
    ctx.fillRect(0, 0, width, height);

    ctx.restore();
  }

  function drawDust() {
    ctx.save();
    dust.forEach(d => {
      d.x -= d.drift;
      d.y -= d.drift * 0.3;
      if (d.x < -10) d.x = width + 10;
      if (d.y < -10) d.y = height + 10;

      ctx.beginPath();
      ctx.fillStyle = `rgba(199, 184, 255, ${d.alpha})`;
      ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  }

  function drawStars() {
    ctx.save();
    stars.forEach(s => {
      s.phase += s.twinkleSpeed;
      const a = s.baseAlpha * (0.5 + 0.5 * Math.sin(s.phase));
      s.x -= s.drift * 0.1;
      if (s.x < -5) { s.x = width + 5; s.y = Math.random() * height; }

      /* 主星点 */
      ctx.beginPath();
      ctx.fillStyle = s.color + a + ')';
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();

      /* 大星加光晕 */
      if (s.r > 1) {
        ctx.beginPath();
        const glow = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r * 6);
        glow.addColorStop(0, s.color + (a * 0.5) + ')');
        glow.addColorStop(1, s.color + '0)');
        ctx.fillStyle = glow;
        ctx.arc(s.x, s.y, s.r * 6, 0, Math.PI * 2);
        ctx.fill();
      }

      /* 偶尔的十字光芒（最亮的几颗） */
      if (s.r > 1.2 && Math.sin(s.phase * 0.5) > 0.95) {
        const len = s.r * 4;
        ctx.strokeStyle = s.color + (a * 0.7) + ')';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(s.x - len, s.y);
        ctx.lineTo(s.x + len, s.y);
        ctx.moveTo(s.x, s.y - len);
        ctx.lineTo(s.x, s.y + len);
        ctx.stroke();
      }
    });
    ctx.restore();
  }

  function drawShootingStars() {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = shootingStars.length - 1; i >= 0; i--) {
      const s = shootingStars[i];
      s.life++;
      s.x += s.vx;
      s.y += s.vy;

      const tailAlpha = 1 - s.life / s.maxLife;
      const grd = ctx.createLinearGradient(
        s.x - s.vx * 8, s.y - s.vy * 8,
        s.x, s.y
      );
      grd.addColorStop(0, 'rgba(255, 255, 255, 0)');
      grd.addColorStop(0.6, `rgba(199, 184, 255, ${tailAlpha * 0.5})`);
      grd.addColorStop(1, `rgba(255, 255, 255, ${tailAlpha})`);

      ctx.strokeStyle = grd;
      ctx.lineWidth = 1.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(s.x - s.vx * 8, s.y - s.vy * 8);
      ctx.lineTo(s.x, s.y);
      ctx.stroke();

      /* 头部光晕 */
      ctx.fillStyle = `rgba(255, 255, 255, ${tailAlpha})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, 2, 0, Math.PI * 2);
      ctx.fill();

      if (s.life >= s.maxLife || s.x > width + 100) {
        shootingStars.splice(i, 1);
      }
    }
    ctx.restore();
  }

  /* 爆发星尘：独立的短命粒子，向上飘散后消亡 */
  function drawBursts() {
    if (!bursts.length) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = bursts.length - 1; i >= 0; i--) {
      const p = bursts[i];
      p.life++;
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.96;
      p.vy = p.vy * 0.96 - 0.02; /* 微微向上浮 */
      const t = 1 - p.life / p.maxLife;
      if (t <= 0) { bursts.splice(i, 1); continue; }

      ctx.beginPath();
      ctx.fillStyle = p.color + (t * 0.9) + ')';
      ctx.arc(p.x, p.y, p.r * (0.5 + t * 0.5), 0, Math.PI * 2);
      ctx.fill();

      /* 光晕 */
      const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 5);
      glow.addColorStop(0, p.color + (t * 0.4) + ')');
      glow.addColorStop(1, p.color + '0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * 5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  /* 鼠标点击位置爆出一团星尘 */
  function burst(x, y) {
    if (bursts.length > 120) return; /* 防止连点堆积 */
    const count = 14;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5;
      const speed = 1 + Math.random() * 2;
      bursts.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        r: Math.random() * 1.5 + 0.8,
        color: STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)],
        life: 0,
        maxLife: 40 + Math.random() * 20,
      });
    }
  }

  return { init, burst, maybeShootingStar };
})();

/* ---- 漂浮梦境碎片 ---- */
const DreamMotes = (() => {
  const motes = [];

  function init() {
    spawnMotes(8);
    setInterval(spawnOne, 4500);
  }

  function spawnMotes(count) {
    for (let i = 0; i < count; i++) spawnOne();
  }

  function spawnOne() {
    const el = document.createElement('div');
    const symbols = ['✦', '✧', '◌', '○', '·', '°', '⋆', '☾', '◇', '✺', '◦'];
    const colors = ['var(--violet-pale)', 'var(--aurora-pink)', 'var(--aurora-gold)', 'var(--violet-glow)'];

    el.className = 'dream-mote';
    el.textContent = symbols[Math.floor(Math.random() * symbols.length)];
    Object.assign(el.style, {
      position: 'fixed',
      left: Math.random() * 100 + 'vw',
      bottom: '-30px',
      color: colors[Math.floor(Math.random() * colors.length)],
      fontSize: (10 + Math.random() * 14) + 'px',
      opacity: '0',
      pointerEvents: 'none',
      zIndex: '0',
      filter: 'blur(0.3px)',
      transition: 'transform 14s linear, opacity 3s ease',
    });
    document.body.appendChild(el);
    requestAnimationFrame(() => {
      el.style.opacity = 0.5 + Math.random() * 0.4;
      el.style.transform = `translateY(-110vh) translateX(${(Math.random() - 0.5) * 80}px) rotate(${(Math.random() - 0.5) * 360}deg)`;
    });
    setTimeout(() => el.remove(), 16000);
  }

  return { init };
})();
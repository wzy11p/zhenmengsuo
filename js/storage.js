/* ============================================================
   枕梦索 · 本地存储
   所有梦境、用户偏好都保存在这里
   ============================================================ */

const Storage = {
  KEYS: {
    USER:       'zms.user',
    DREAMS:     'zms.dreams',
    SETTINGS:   'zms.settings',
    ONBOARDED:  'zms.onboarded',
    TIPS:       'zms.tipIndex',
    DRAFT:      'zms.draft',
  },

  /* ---- 通用 ---- */
  get(key, fallback = null) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      return false;
    }
  },
  remove(key) { localStorage.removeItem(key); },
  requireSet(key, value) {
    if (!this.set(key, value)) {
      throw new Error('浏览器未能保存，可能是空间不足或禁止存储。内容还在，请先导出或下载声音，再重试。');
    }
  },

  /* ---- 用户 ---- */
  getUser() {
    return this.get(this.KEYS.USER, {
      name: '',
      gender: '',
      dreamFrequency: '',
      goals: [],
      theme: 'night',
      createdAt: Date.now(),
    });
  },
  setUser(patch) {
    const u = { ...this.getUser(), ...patch };
    this.requireSet(this.KEYS.USER, u);
    return u;
  },

  /* ---- 梦境 ---- */
  getDreams() {
    try {
      const raw = localStorage.getItem(this.KEYS.DREAMS);
      const data = raw === null ? [] : JSON.parse(raw);
      if (!Array.isArray(data) || data.some(d => !d || typeof d.id !== 'string' || !Number.isFinite(d.createdAt))) throw new Error();
      this.dreamReadError = false;
      return data;
    } catch (error) {
      this.dreamReadError = true;
      return [];
    }
  },
  saveDream(dream) {
    const dreams = this.getDreams();
    if (this.dreamReadError) throw new Error('原有记录暂时无法读取。为避免覆盖，已停止保存；请先导出备份。');
    const idx = dreams.findIndex(d => d.id === dream.id);
    if (idx >= 0) dreams[idx] = dream;
    else dreams.unshift(dream);
    this.requireSet(this.KEYS.DREAMS, dreams);
    return dreams;
  },
  deleteDream(id) {
    const dreams = this.getDreams().filter(d => d.id !== id);
    if (this.dreamReadError) throw new Error('无法读取原有记录，已停止删除。');
    this.requireSet(this.KEYS.DREAMS, dreams);
    return dreams;
  },
  getDreamById(id) {
    return this.getDreams().find(d => d.id === id);
  },

  /* ---- 设置 ---- */
  getSettings() {
    return this.get(this.KEYS.SETTINGS, {
      dailyTip: true,
      reminder: false,
      moonAlert: true,
      theme: 'night',
    });
  },
  setSetting(key, value) {
    const s = this.getSettings();
    s[key] = value;
    this.requireSet(this.KEYS.SETTINGS, s);
    return s;
  },

  /* ---- 已引导 ---- */
  isOnboarded() { return !!this.get(this.KEYS.ONBOARDED, false); },
  markOnboarded() { this.requireSet(this.KEYS.ONBOARDED, true); },
  getDraft() { return this.get(this.KEYS.DRAFT); },
  saveDraft(draft) { this.requireSet(this.KEYS.DRAFT, draft); },
  clearDraft() { this.remove(this.KEYS.DRAFT); },

  /* ---- 当日提示索引 ---- */
  nextTip() {
    let i = this.get(this.KEYS.TIPS, 0);
    const tips = TIPS.daily;
    const tip = tips[i % tips.length];
    this.set(this.KEYS.TIPS, (i + 1) % tips.length);
    return tip;
  },

  /* ---- 清空 ---- */
  clearAll() {
    Object.values(this.KEYS).forEach(k => this.remove(k));
  },
};

/* ---- 每日小提示 ---- */
const TIPS = {
  daily: [
    '醒来时不要急着睁眼，先在黑暗里回想最后一个画面——它往往是最重要的那一片。',
    '如果记不住梦，不要紧。记下情绪——那也是真实的一部分。',
    '有些梦会重复出现。如果你注意到一个反复的符号，它正在对你说话。',
    '今晚试着在枕边放一支笔。半梦半醒时写下任何一个字。',
    '梦境的清晰度和你的睡眠周期有关——不必强求每个梦都记住。',
    '试试在睡前对一个具体的问题默念三遍，看看它会不会回到你的梦里。',
    '梦里的陌生人有时是另一个自己。留意他们看你的眼神。',
    '今天记得在阳光下走一走。让光线替你把昨夜的画面整理归档。',
  ],

  /* ---- 引导文案 ---- */
  onboarding: [
    { q: '我们应该怎么称呼你？', sub: '出现在问候里，让这一刻更亲切。',
      type: 'text', field: 'name', placeholder: '一个名字，一个昵称……' },
    { q: '你多久能记得自己做过的梦？', sub: '这帮助我们调整提示的方式。',
      type: 'choice', field: 'dreamFrequency', options: [
        { e: '🌟', l: '几乎每天', s: '醒来的瞬间，画面还在' },
        { e: '🌙', l: '每周一两次', s: '总有几个值得记住的' },
        { e: '🌑', l: '每月偶尔', s: '偶尔闪过几个片段' },
        { e: '🫥', l: '很少记得', s: '感觉每个清晨都是空白' },
      ] },
    { q: '用枕梦索，你最想收获什么？', sub: '可以多选。',
      type: 'multi', field: 'goals', options: [
        { e: '🪞', l: '更了解自己', s: '梦是潜意识的镜子' },
        { e: '🌿', l: '理解噩梦', s: '先留下画面和醒来的感受' },
        { e: '💡', l: '获得灵感', s: '许多创作来自梦的碎片' },
        { e: '🌌', l: '进入清醒梦', s: '练习在梦里保持清醒' },
        { e: '📔', l: '简单留个记录', s: '偶尔写写就好' },
      ] },
    { q: '你想在哪个时间留一会给梦？', sub: '先记下你的习惯；此版本还不会发送定时通知。',
      type: 'time', field: 'reminderTime', default: '08:00' },
    { q: '准备好开始了吗？', sub: '你可以随时回来修改这些。',
      type: 'finish' },
  ],
};

/* ---- 工具 ---- */
const Utils = {
  uid: () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
  fmtDate: (ts) => {
    const d = new Date(ts);
    const now = new Date();
    const diff = (now - d) / 1000;
    if (diff < 60) return '刚刚';
    if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} 小时前`;
    if (diff < 86400 * 3) return `${Math.floor(diff / 86400)} 天前`;
    return `${d.getMonth() + 1} 月 ${d.getDate()} 日`;
  },
  fmtFullDate: (ts) => {
    const d = new Date(ts);
    return `${d.getFullYear()} 年 ${d.getMonth() + 1} 月 ${d.getDate()} 日`;
  },
  greetTime: () => {
    const h = new Date().getHours();
    if (h < 5)  return { eyebrow: '夜深', heading: '还在熬着呀', sub: '记得给明天的自己留点力气' };
    if (h < 11) return { eyebrow: '晨安', heading: '早安', sub: '昨夜的梦还在吗？' };
    if (h < 14) return { eyebrow: '午安', heading: '适合安静一会', sub: '把夜晚留给自己' };
    if (h < 18) return { eyebrow: '午后', heading: '下午好', sub: '困意可能正在悄悄靠近' };
    if (h < 22) return { eyebrow: '入夜', heading: '夜色温柔', sub: '适合静下来' };
    return { eyebrow: '夜安', heading: '夜色很轻', sub: '该准备入睡了' };
  },

  /* 月相（粗略计算） */
  moonPhase: (date = new Date()) => {
    const lp = 2551443000; // 一个朔望月毫秒数，与 Date.getTime 单位一致
    const reference = new Date('2000-01-06T18:14:00Z').getTime();
    const now = date.getTime();
    const phase = (((now - reference) % lp) + lp) % lp / lp;
    // 0=新月, 0.25=上弦, 0.5=满月, 0.75=下弦
    const cycle = Math.floor(((now - reference) / lp) + 1);
    let name, day;
    if (phase < 0.03 || phase > 0.97)      { name = '新月';   day = 1; }
    else if (phase < 0.22)                 { name = '蛾眉月'; day = 4; }
    else if (phase < 0.28)                 { name = '上弦月'; day = 7; }
    else if (phase < 0.47)                 { name = '盈凸月'; day = 11; }
    else if (phase < 0.53)                 { name = '满月';   day = 14; }
    else if (phase < 0.72)                 { name = '亏凸月'; day = 18; }
    else if (phase < 0.78)                 { name = '下弦月'; day = 22; }
    else                                    { name = '残月';   day = 27; }
    return { name, day, phaseValue: phase };
  },

  /* 农历（粗略） */
  lunarDay: (date = new Date()) => {
    try {
      return new Intl.DateTimeFormat('zh-CN-u-ca-chinese', { month: 'long', day: 'numeric' }).format(date);
    } catch { return '月相为近似值'; }
  },

  /* 字符级拆字 */
  splitChars: (str) => Array.from(str),

  /* 简单分词 */
  extractKeywords: (text, max = 12) => {
    if (!text) return [];
    const stop = new Set('的了我在是你他她它我们你他们啊吧呢吗哦呀嗯就是还是不是已经也有都很到的说说过一些那么这样那样什么因为所以一个这个那个这些那些自己所以'.split(''));
    const freq = {};
    // 拆词：中文字符 1-2 字组合 + 英文单词
    const tokens = [];
    // 提取中文片段
    const cnMatches = text.match(/[\u4e00-\u9fa5]+/g) || [];
    cnMatches.forEach(seg => {
      for (let i = 0; i < seg.length; i++) {
        tokens.push(seg[i]);
        if (i < seg.length - 1) tokens.push(seg[i] + seg[i + 1]);
      }
    });
    // 提取英文单词
    const enMatches = text.match(/[a-zA-Z]+/g) || [];
    enMatches.forEach(w => tokens.push(w.toLowerCase()));

    tokens.forEach(t => {
      if (t.length < 2) return;
      if (stop.has(t)) return;
      freq[t] = (freq[t] || 0) + 1;
    });
    return Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, max)
      .map(([w]) => w);
  },

  /* 情绪颜色 */
  moodColor: (m) => {
    const map = {
      calm:     '#6DA9FF',
      joyful:   '#FFD580',
      anxious:  '#FF8FB8',
      sad:      '#5EE2D6',
      confused: '#9D80FF',
      curious:  '#B197FC',
      fearful:  '#F5A0C2',
      loved:    '#FF8FB8',
    };
    return map[m] || '#9D80FF';
  },
  moodLabel: (m) => {
    const map = {
      calm: '平静', joyful: '愉悦', anxious: '焦虑', sad: '忧伤',
      confused: '困惑', curious: '好奇', fearful: '害怕', loved: '被爱',
    };
    return map[m] || m;
  },

  /* 主题应用 */
  applyTheme(name) {
    document.documentElement.setAttribute('data-theme', name);
  },
};

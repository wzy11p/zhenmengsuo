/* ============================================================
   枕梦索 · 梦境管理
   增删改查、详情视图、热力图数据
   ============================================================ */

const Dreams = (() => {

  /* ---- 列表渲染（Dashboard） ---- */
  function renderDashboard() {
    const dreams = Storage.getDreams();
    const user = Storage.getUser();
    const list = document.getElementById('dreamList');

    /* 问候 */
    const g = Utils.greetTime();
    document.getElementById('greetEyebrow').textContent = g.eyebrow;
    document.getElementById('greetHeading').textContent = `${user.name || '欢迎回来'}，${g.heading}`;
    document.getElementById('greetTime').textContent = g.sub;

    /* 统计 */
    document.getElementById('statDreams').textContent = dreams.length;

    /* 连续天数 */
    const streak = calcStreak(dreams);
    document.getElementById('statStreak').textContent = streak;

    /* 主题云 */
    const allKw = dreams.flatMap(d => d.tags || []);
    if (allKw.length) {
      const freq = Object.create(null);
      allKw.forEach(t => { freq[t] = (freq[t] || 0) + 1; });
      const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]);
      document.getElementById('statTop').textContent = sorted[0][0];
      document.getElementById('statTopCount').textContent = sorted[0][1];
    } else {
      document.getElementById('statTop').textContent = '—';
      document.getElementById('statTopCount').textContent = '0';
    }

    /* 最近情绪 */
    const last = dreams[0];
    if (last && last.mood) {
      document.getElementById('statMood').textContent = Utils.moodLabel(last.mood);
    } else document.getElementById('statMood').textContent = '—';

    /* 月相 */
    const moon = Utils.moonPhase();
    document.getElementById('moonPhase').textContent = moon.name;
    document.getElementById('moonDate').textContent = `${new Date().getMonth() + 1} 月 ${new Date().getDate()} 日 · ${Utils.lunarDay()}`;
    document.getElementById('moonVisual').innerHTML = Moon.renderSVG(moon.phaseValue, 120);

    /* 列表 */
    if (Storage.dreamReadError) {
      list.innerHTML = '<p role="alert">记录暂时无法读取，原数据没有被覆盖。请到设置导出备份后再处理。</p>';
    } else if (!dreams.length) {
      list.innerHTML = `
        <div class="empty-state" style="grid-column: 1/-1;">
          <span class="empty-icon">🌙</span>
          <h3>还没有梦境</h3>
          <p>今晚就开始记录第一个吧</p>
          <button class="btn btn-primary btn-arrow mt-6" data-go="write">记录梦境</button>
        </div>
      `;
    } else {
      list.innerHTML = dreams.map(d => renderDreamCard(d)).join('');
      list.querySelectorAll('.dream-card').forEach(card => {
        card.addEventListener('click', () => {
          const id = card.dataset.id;
          renderDetail(id);
          App.go('detail');
        });
      });
    }

    /* 每日一句 */
    const settings = Storage.getSettings();
    if (settings.dailyTip) {
      document.querySelector('.tip-card').style.display = '';
    } else {
      document.querySelector('.tip-card').style.display = 'none';
    }
  }

  function renderDreamCard(d) {
    const excerpt = (d.body || '').slice(0, 140);
    const moodColor = Utils.moodColor(d.mood);
    return `
      <div class="card dream-card" role="button" tabindex="0" data-id="${escapeHtml(d.id)}">
        <div class="dream-meta">
          <span>${Utils.fmtDate(d.createdAt)}</span>
          ${d.mood ? `
            <span class="dream-mood">
              <span class="dream-mood-dot" style="background: ${moodColor}; box-shadow: 0 0 8px ${moodColor};"></span>
              ${escapeHtml(Utils.moodLabel(d.mood))}
            </span>
          ` : ''}
        </div>
        <h3>${escapeHtml(d.title || '未命名的梦')}</h3>
        <p class="dream-excerpt">${escapeHtml(excerpt || (d.audio ? '这一段梦，留在声音里。' : ''))}</p>
        <div class="dream-tags">
          ${(d.tags || []).slice(0, 4).map(t => `<span class="badge badge-violet">#${escapeHtml(t)}</span>`).join('')}
        </div>
      </div>
    `;
  }

  /* ---- 详情渲染 ---- */
  function renderDetail(id) {
    const dream = Storage.getDreamById(id);
    if (!dream) return App.go('dashboard');

    document.getElementById('detailTitle').textContent = dream.title || '未命名的梦';

    const meta = [];
    meta.push(Utils.fmtFullDate(dream.createdAt));
    if (dream.sleepTime) meta.push(escapeHtml(`睡眠 ${dream.sleepTime} – ${dream.wakeTime || '?'}`));
    if (dream.clarity !== undefined) meta.push(escapeHtml(`清晰度 ${dream.clarity}%`));
    if (dream.mood) meta.push(`<span style="color: ${Utils.moodColor(dream.mood)}">● ${escapeHtml(Utils.moodLabel(dream.mood))}</span>`);
    document.getElementById('detailMeta').innerHTML = meta.join(' · ');

    document.getElementById('detailTags').innerHTML = (dream.tags || [])
      .map(t => `<span class="badge badge-violet">#${escapeHtml(t)}</span>`).join('');

    document.getElementById('detailBody').textContent = dream.body || '';

    /* 语音回放 */
    const audioBox = document.getElementById('detailAudio');
    Voice.stopPlayback();
    audioBox.innerHTML = '';
    if (dream.audio && dream.audio.dataUrl) {
      Voice.renderPlayer(audioBox, dream.audio);
    }

    /* 编辑 / 删除 */
    document.getElementById('detailEdit').onclick = () => startEdit(id);
    document.getElementById('detailDelete').onclick = () => removeDream(id);

    /* 正文从雾中浮起 */
    const bodyEl = document.getElementById('detailBody');
    bodyEl.style.animation = 'none';
    bodyEl.offsetHeight; /* reflow */
    bodyEl.style.animation = 'mist-condense 1.4s var(--ease-dream)';

    /* 相关梦境（同标签或同时段） */
    const all = Storage.getDreams().filter(d => d.id !== id);
    const related = all
      .map(d => {
        const shared = (d.tags || []).filter(t => (dream.tags || []).includes(t)).length;
        return { d, score: shared };
      })
      .filter(x => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(x => x.d);

    const relContainer = document.getElementById('relatedDreams');
    if (related.length) {
      relContainer.innerHTML = related.map(d => renderDreamCard(d)).join('');
      relContainer.querySelectorAll('.dream-card').forEach(c => {
        c.addEventListener('click', () => renderDetail(c.dataset.id) || App.refresh('detail'));
      });
    } else {
      relContainer.innerHTML = '<p class="dim">暂时没有相似的梦境浮现</p>';
    }
  }

  /* ---- Insights 渲染 ---- */
  function renderInsights() {
    const dreams = Storage.getDreams();
    /* 情绪热力图：过去 90 天 */
    renderHeatmap(dreams);
    renderTopicCloud(dreams);
    renderPhasesChart(dreams);
    renderEntities(dreams);
  }

  function renderHeatmap(dreams) {
    const container = document.getElementById('heatmap');
    const days = 90;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const cells = [];
    /* 找每天的情绪 */
    const dayMap = {};
    dreams.forEach(d => {
      const day = new Date(d.createdAt);
      day.setHours(0, 0, 0, 0);
      const key = day.getTime();
      if (!dayMap[key]) dayMap[key] = [];
      dayMap[key].push(d);
    });

    /* 颜色强度 */
    const intensity = (count) => {
      if (count >= 4) return 4;
      if (count >= 2) return 3;
      if (count >= 1) return 2;
      return 0;
    };
    const colors = [
      'rgba(167, 139, 250, 0.06)',
      'rgba(124, 92, 255, 0.25)',
      'rgba(124, 92, 255, 0.5)',
      'rgba(255, 143, 184, 0.65)',
      'linear-gradient(135deg, var(--violet-core), var(--aurora-pink))',
    ];

    /* 渲染：从最早的到今天 */
    /* 留出空白，让最后一列对齐"今天" */
    const firstDate = new Date(today);
    firstDate.setDate(firstDate.getDate() - (days - 1));
    /* 先填充空白，对齐到周一开始 */
    const dayOfWeek = firstDate.getDay();
    const padStart = (dayOfWeek + 6) % 7; // 周一为列 0
    for (let i = 0; i < padStart; i++) cells.push('<div class="cell" style="visibility:hidden"></div>');

    for (let i = 0; i < days; i++) {
      const d = new Date(firstDate);
      d.setDate(d.getDate() + i);
      const key = d.getTime();
      const items = dayMap[key] || [];
      const level = intensity(items.length);
      const style = level >= 4
        ? 'background: linear-gradient(135deg, #7C5CFF, #FF8FB8);'
        : `background: ${colors[level]};`;
      cells.push(`<div class="cell" style="${style}" title="${d.toLocaleDateString()} · ${items.length} 个梦"></div>`);
    }
    container.innerHTML = cells.join('');
  }

  function renderTopicCloud(dreams) {
    const freq = Object.create(null);
    dreams.forEach(d => {
      (d.tags || []).forEach(t => { freq[t] = (freq[t] || 0) + 1; });
    });
    if (!Object.keys(freq).length) {
      document.getElementById('topicCloud').innerHTML = '<p class="dim">还没有标签浮现</p>';
      return;
    }
    const max = Math.max(...Object.values(freq));
    const html = Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .map(([tag, count]) => {
        const size = 12 + (count / max) * 18;
        const weight = count > max * 0.7 ? '600' : count > max * 0.4 ? '500' : '400';
        return `<span class="topic" style="font-size: ${size}px; font-weight: ${weight}; color: hsl(${260 + count * 6}, 70%, ${75 + count * 2}%);">${escapeHtml(tag)}</span>`;
      })
      .join('');
    document.getElementById('topicCloud').innerHTML = html;
  }

  function renderPhasesChart(dreams) {
    /* 按月相分组的梦境长度 */
    const buckets = { '新月': [], '蛾眉月': [], '上弦月': [], '盈凸月': [], '满月': [], '亏凸月': [], '下弦月': [], '残月': [] };
    dreams.forEach(d => {
      const m = Utils.moonPhase(new Date(d.createdAt));
      buckets[m.name].push(d.body ? d.body.length : 0);
    });
    const labels = Object.keys(buckets);
    const avg = labels.map(k => {
      const arr = buckets[k];
      return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length / 10 : 0;
    });
    const max = Math.max(...avg, 1);

    const w = document.getElementById('phasesChart').clientWidth || 800;
    const h = 200;
    const padding = 30;
    const stepX = (w - padding * 2) / (labels.length - 1);
    let pathD = '';
    let areaD = '';
    labels.forEach((l, i) => {
      const x = padding + i * stepX;
      const y = h - padding - (avg[i] / max) * (h - padding * 2);
      pathD += (i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`);
    });
    /* 区域 */
    areaD = pathD + ` L ${padding + (labels.length - 1) * stepX} ${h - padding} L ${padding} ${h - padding} Z`;

    const points = labels.map((l, i) => {
      const x = padding + i * stepX;
      const y = h - padding - (avg[i] / max) * (h - padding * 2);
      return `<circle cx="${x}" cy="${y}" r="4" fill="white" stroke="var(--violet-glow)" stroke-width="2"/>`;
    }).join('');

    const labelsHtml = labels.map((l, i) => {
      const x = padding + i * stepX;
      return `<text x="${x}" y="${h - 8}" text-anchor="middle" fill="var(--text-dim)" font-size="11" font-family="Inter, sans-serif">${l}</text>`;
    }).join('');

    document.getElementById('phasesChart').innerHTML = `
      <svg width="100%" height="${h}" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
        <defs>
          <linearGradient id="phaseArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="rgba(157, 128, 255, 0.5)"/>
            <stop offset="100%" stop-color="rgba(157, 128, 255, 0)"/>
          </linearGradient>
          <linearGradient id="phaseLine" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stop-color="#7C5CFF"/>
            <stop offset="100%" stop-color="#FF8FB8"/>
          </linearGradient>
        </defs>
        <path d="${areaD}" fill="url(#phaseArea)" />
        <path d="${pathD}" stroke="url(#phaseLine)" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" />
        ${points}
        ${labelsHtml}
      </svg>
    `;
  }

  function renderEntities(dreams) {
    const entities = { people: Object.create(null), places: Object.create(null) };
    dreams.forEach(d => {
      (d.tags || []).forEach(t => {
        /* 简化：把所有 tag 都按人物/场景处理 */
        if (t.match(/^(家|学校|公司|海|森林|楼|街|山|河|湖|城|房间|楼顶|地下|路|桥|窗|门|雨|雪|梦)/)) {
          entities.places[t] = (entities.places[t] || 0) + 1;
        } else {
          entities.people[t] = (entities.people[t] || 0) + 1;
        }
      });
    });

    const maxP = Math.max(...Object.values(entities.people), 1);
    document.getElementById('peopleList').innerHTML = Object.entries(entities.people)
      .sort((a, b) => b[1] - a[1]).slice(0, 6)
      .map(([n, c]) => `
        <div class="entity-row">
          <div class="entity-emoji">✦</div>
          <div class="entity-name">${escapeHtml(n)}</div>
          <div class="entity-bar"><div style="width: ${(c / maxP) * 100}%"></div></div>
          <div class="entity-count">${c}</div>
        </div>
      `).join('') || '<p class="dim">还没有</p>';

    const maxPl = Math.max(...Object.values(entities.places), 1);
    document.getElementById('placesList').innerHTML = Object.entries(entities.places)
      .sort((a, b) => b[1] - a[1]).slice(0, 6)
      .map(([n, c]) => `
        <div class="entity-row">
          <div class="entity-emoji">◇</div>
          <div class="entity-name">${escapeHtml(n)}</div>
          <div class="entity-bar"><div style="width: ${(c / maxPl) * 100}%"></div></div>
          <div class="entity-count">${c}</div>
        </div>
      `).join('') || '<p class="dim">还没有</p>';
  }

  /* ---- 写梦境保存 ---- */
  function collectForm() {
    const title = document.getElementById('writeTitle').value.trim();
    const body = document.getElementById('writeBody').value.trim();
    const clarity = parseInt(document.getElementById('writeClarity').value, 10);
    const sleepTime = document.getElementById('writeSleep').value;
    const wakeTime = document.getElementById('writeWake').value;
    const moodEl = document.querySelector('.mood-pill.is-selected');
    const mood = moodEl ? moodEl.dataset.mood : '';
    const tags = Array.from(document.querySelectorAll('#writeTags .tag-chip[data-tag]'))
      .map(c => c.dataset.tag);
    return { title, body, clarity, sleepTime, wakeTime, mood, tags, audio: Voice.getPending() || null };
  }

  function message(text) {
    document.getElementById('writeStatus').textContent = text;
  }

  let saving = false;
  let baseline = '';
  function hasChanges() { return JSON.stringify(collectForm()) !== baseline; }
  function saveDraft() {
    if (saving || Voice.isRecording()) { message('请先结束录音，等声音整理完成。'); return; }
    const form = collectForm();
    if (!form.title && !form.body && !form.audio) { message('先留下一点文字或声音吧。'); return; }
    try {
      Storage.saveDraft({ ...form, editingId: currentEditingId, savedAt: Date.now() });
      baseline = JSON.stringify(form);
      message('草稿已留在这个浏览器里，尚未加入正式记录。');
    } catch (error) { message(error.message); }
  }

  function saveWriteForm() {
    if (saving) return;
    if (Voice.isRecording()) { message('请先结束录音，等声音整理完成。'); return; }
    const form = collectForm();
    if (!form.body && !form.audio) {
      message('写一点梦的内容，或录下一段声音，再保存。');
      shakeForm();
      return;
    }
    const prev = currentEditingId ? Storage.getDreamById(currentEditingId) : null;
    const dream = {
      ...form,
      id: currentEditingId || Utils.uid(),
      createdAt: prev ? prev.createdAt : Date.now(),
      updatedAt: Date.now(),
    };
    try { Storage.saveDream(dream); }
    catch (error) { message(error.message); return; }
    saving = true;
    document.getElementById('writeSave').disabled = true;
    document.getElementById('writeDraft').disabled = true;
    try { Storage.clearDraft(); } catch { /* 正式记录已写入，保留旧草稿不影响这次保存 */ }
    clearWriteForm();
    message('梦境已保存到这个浏览器。');
    /* 庆祝动效 */
    celebrateSave();
    setTimeout(() => {
      saving = false;
      document.getElementById('writeSave').disabled = false;
      document.getElementById('writeDraft').disabled = false;
      App.go('dashboard');
    }, 1100);
  }

  let currentEditingId = null;

  /* ---- 编辑：把旧梦装回写梦页 ---- */
  function startEdit(id) {
    const d = Storage.getDreamById(id);
    if (!d) return;
    if (hasChanges() && !confirm('记录页还有未保存的内容。要放下它，编辑这个梦吗？')) return;
    currentEditingId = id;
    fillForm(d);
    message('正在编辑已有梦境，保存会更新原记录。');
    App.go('write', { word: '回到那一夜…' });
  }

  function fillForm(d) {
    document.getElementById('writeTitle').value = d.title || '';
    document.getElementById('writeBody').value = d.body || '';
    document.getElementById('writeClarity').value = d.clarity ?? 50;
    document.getElementById('writeClarity').dispatchEvent(new Event('input'));
    document.getElementById('writeSleep').value = d.sleepTime || '23:00';
    document.getElementById('writeWake').value = d.wakeTime || '07:00';

    document.querySelectorAll('.mood-pill').forEach(p => {
      p.classList.toggle('is-selected', p.dataset.mood === d.mood);
    });

    const tagBox = document.getElementById('writeTags');
    tagBox.innerHTML = '';
    (d.tags || []).forEach(t => addTag(t));

    /* 语音：恢复为待保存状态 */
    Voice.setPending(d.audio || null);
    renderVoiceClipArea();
    document.getElementById('writeBody').dispatchEvent(new Event('input'));
    baseline = JSON.stringify(collectForm());
  }

  function restoreDraft() {
    const d = Storage.getDraft();
    if (d && typeof d.body === 'string' && typeof d.title === 'string' && Array.isArray(d.tags)) {
      currentEditingId = typeof d.editingId === 'string' ? d.editingId : null;
      fillForm(d);
      message('上次的草稿已接回来，可以继续写。');
    } else baseline = JSON.stringify(collectForm());
  }

  /* ---- 删除：化作星光散去 ---- */
  function removeDream(id) {
    const d = Storage.getDreamById(id);
    if (!d) return;
    if (!confirm(`让「${d.title || '这个梦'}」散去吗？\n它将从你的殿堂里消失。`)) return;
    try { Storage.deleteDream(id); }
    catch (error) { alert(error.message); return; }
    Voice.stopPlayback();

    const detail = document.querySelector('.dream-detail');
    if (detail) {
      detail.style.animation = 'mist-dissolve 900ms var(--ease-dream) forwards';
    }
    setTimeout(() => {
      App.go('dashboard', { word: '它已化作星光' });
    }, 850);
  }

  function shakeForm() {
    const el = document.querySelector('.write-canvas');
    el.animate([
      { transform: 'translateX(0)' },
      { transform: 'translateX(-8px)' },
      { transform: 'translateX(8px)' },
      { transform: 'translateX(-4px)' },
      { transform: 'translateX(0)' },
    ], { duration: 400 });
  }

  function celebrateSave() {
    /* 在页面中心生成梦境碎片 */
    const symbols = ['✦', '✧', '◌', '○', '·', '⋆', '☾', '✺', '◦', '°', '✶', '✷'];
    const colors = ['var(--violet-pale)', 'var(--aurora-pink)', 'var(--aurora-gold)', 'var(--violet-glow)'];
    for (let i = 0; i < 24; i++) {
      const el = document.createElement('span');
      el.textContent = symbols[Math.floor(Math.random() * symbols.length)];
      const startX = window.innerWidth / 2;
      const startY = window.innerHeight / 2;
      Object.assign(el.style, {
        position: 'fixed',
        left: startX + 'px',
        top: startY + 'px',
        fontSize: (16 + Math.random() * 18) + 'px',
        color: colors[Math.floor(Math.random() * colors.length)],
        pointerEvents: 'none',
        zIndex: '999',
        filter: 'drop-shadow(0 0 12px currentColor)',
      });
      document.body.appendChild(el);
      const angle = (i / 24) * Math.PI * 2 + Math.random() * 0.5;
      const distance = 200 + Math.random() * 200;
      el.animate([
        { transform: 'translate(-50%, -50%) scale(0)', opacity: 0 },
        { transform: 'translate(-50%, -50%) scale(1.5)', opacity: 1, offset: 0.3 },
        { transform: `translate(calc(-50% + ${Math.cos(angle) * distance}px), calc(-50% + ${Math.sin(angle) * distance}px)) scale(0.5)`, opacity: 0 },
      ], { duration: 1100, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' }).onfinish = () => el.remove();
    }
    /* 流星雨 */
    for (let i = 0; i < 3; i++) setTimeout(() => Starfield.maybeShootingStar(), i * 250);
  }

  function clearWriteForm() {
    document.getElementById('writeTitle').value = '';
    document.getElementById('writeBody').value = '';
    document.getElementById('writeClarity').value = 50;
    document.getElementById('writeClarity').dispatchEvent(new Event('input'));
    document.getElementById('writeBody').dispatchEvent(new Event('input'));
    document.getElementById('clarityValue').textContent = '50%';
    document.getElementById('writeSleep').value = '23:00';
    document.getElementById('writeWake').value = '07:00';
    document.querySelectorAll('.mood-pill').forEach(p => p.classList.remove('is-selected'));
    document.getElementById('writeTags').innerHTML = '';
    Voice.clearPending();
    renderVoiceClipArea();
    currentEditingId = null;
    baseline = JSON.stringify(collectForm());
  }

  /* ---- 写梦页的语音片段预览 ---- */
  function renderVoiceClipArea() {
    const area = document.getElementById('voiceClipArea');
    if (!area) return;
    const clip = Voice.getPending();
    if (!clip) { area.innerHTML = ''; return; }
    area.innerHTML = `
      <div class="voice-clip">
        <span class="vc-icon">✦</span>
        <span class="vc-label">待保存 · ${Voice.fmtTime(clip.duration)} 的声音</span>
        <button type="button" class="vc-del" id="voiceClipDownload">下载</button>
        <button type="button" class="vc-del" id="voiceClipDel">散去</button>
      </div>
    `;
    document.getElementById('voiceClipDel').onclick = () => {
      Voice.clearPending();
      renderVoiceClipArea();
    };
    document.getElementById('voiceClipDownload').onclick = () => Voice.download();
  }

  /* ---- 标签输入 ---- */
  function addTag(text) {
    if (!text || !text.trim()) return;
    const tag = text.trim().slice(0, 30);
    const container = document.getElementById('writeTags');
    const existing = Array.from(container.querySelectorAll('[data-tag]'));
    if (existing.some(c => c.dataset.tag === tag) || existing.length >= 12) return;
    const chip = document.createElement('span');
    chip.className = 'tag-chip badge badge-violet';
    chip.dataset.tag = tag;
    chip.setAttribute('role', 'button');
    chip.tabIndex = 0;
    chip.setAttribute('aria-label', '移除标签 ' + tag);
    chip.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); chip.click(); } });
    chip.style.cssText = 'cursor: pointer; transition: all 0.3s;';
    chip.innerHTML = `#${escapeHtml(tag)} ✕`;
    chip.addEventListener('click', () => {
      delete chip.dataset.tag;
      chip.style.transform = 'scale(0)';
      setTimeout(() => chip.remove(), 300);
    });
    /* 入场动画 */
    chip.style.transform = 'scale(1)';
    chip.animate([
      { transform: 'scale(0) rotate(-30deg)', opacity: 0 },
      { transform: 'scale(1.2) rotate(10deg)', opacity: 1, offset: 0.6 },
      { transform: 'scale(1) rotate(0)', opacity: 1 },
    ], { duration: 500, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' });
    container.appendChild(chip);
  }

  /* ---- 工具 ---- */
  function calcStreak(dreams) {
    if (!dreams.length) return 0;
    const days = new Set(dreams.map(d => {
      const dt = new Date(d.createdAt);
      dt.setHours(0, 0, 0, 0);
      return dt.getTime();
    }));
    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = 0; i < 365; i++) {
      if (days.has(today.getTime() - i * 86400000)) streak++;
      else if (i > 0) break;
    }
    return streak;
  }

  function escapeHtml(s) {
    if (s === undefined || s === null) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  return {
    renderDashboard,
    renderInsights,
    renderDetail,
    saveWriteForm,
    saveDraft,
    restoreDraft,
    hasChanges,
    addTag,
    clearWriteForm,
    startEdit,
    removeDream,
    renderVoiceClipArea,
  };
})();

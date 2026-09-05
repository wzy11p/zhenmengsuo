/* ============================================================
   枕梦索 · 语音拾梦
   醒来还迷糊的时候，说出来比写下来快。
   MediaRecorder 录音，base64 存进梦境。
   ============================================================ */

const Voice = (() => {
  const MAX_SECONDS = 120;

  let recorder = null;
  let stream = null;
  let chunks = [];
  let startTs = 0;
  let timerInt = null;
  let audioCtx = null;
  let analyser = null;
  let levelInt = null;
  let state = 'idle';
  let generation = 0;
  let activeUI = {};
  let stopPromise = null;
  let finishStop = null;
  let stopTs = 0;
  let playingAudio = null;

  /* 当前暂存的录音（随梦境一起保存） */
  let pendingClip = null;

  function supported() {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);
  }

  /* ---- 开始录音 ---- */
  async function start(ui) {
    if (state !== 'idle') return false;
    if (!supported()) {
      ui.onError && ui.onError('这个浏览器还不支持语音记录');
      return false;
    }
    state = 'requesting';
    const request = ++generation;
    activeUI = ui;
    ui.onWaiting && ui.onWaiting();
    try {
      const acquired = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (request !== generation || document.hidden) {
        acquired.getTracks().forEach(t => t.stop());
        if (request === generation) { state = 'idle'; ui.onError && ui.onError('请回到页面后重新录音。'); }
        return false;
      }
      stream = acquired;
    } catch (e) {
      if (request !== generation) return false;
      state = 'idle';
      ui.onError && ui.onError('需要允许使用麦克风，才能把梦说出来');
      return false;
    }

    chunks = [];
    try {
      const mimeType = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus']
        .find(type => MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(type));
      recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
    } catch (error) {
      release();
      state = 'idle';
      ui.onError && ui.onError('无法启动录音，请换一个浏览器，或先用文字记录。');
      return false;
    }
    const recording = recorder;
    const mime = recording.mimeType || 'audio/webm';
    stopPromise = null;
    stopTs = 0;
    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
    recorder.onstop = () => {
      state = 'stopping';
      if (!stopPromise) stopPromise = new Promise(resolve => { finishStop = resolve; });
      activeUI.onFinishing && activeUI.onFinishing();
      const blob = new Blob(chunks, { type: mime });
      const duration = Math.max(0, Math.round(((stopTs || Date.now()) - startTs) / 1000));
      release();
      recorder = null;
      const finish = (clip, error) => {
        state = 'idle';
        if (clip) pendingClip = clip;
        if (error) activeUI.onError && activeUI.onError(error);
        else activeUI.onStop && activeUI.onStop(clip);
        if (finishStop) finishStop(clip);
        finishStop = null;
        stopPromise = null;
      };
      if (!blob.size) { finish(null, '没有收到声音，请重新录制。'); return; }
      const reader = new FileReader();
      reader.onload = () => finish({ dataUrl: reader.result, duration, mimeType: mime });
      reader.onerror = () => finish(null, '声音未能整理完成，请重试。');
      reader.readAsDataURL(blob);
    };
    recorder.onerror = () => { ui.onError && ui.onError('麦克风已中断，正在尝试保留收到的声音。'); stop(); };
    startTs = Date.now();
    try { recorder.start(200); state = 'recording'; }
    catch (error) {
      release(); recorder = null; state = 'idle';
      ui.onError && ui.onError('录音启动失败，请重试或使用文字记录。');
      return false;
    }
    stream.getTracks().forEach(track => { track.onended = () => { if (state === 'recording') stop(); }; });

    /* 计时 */
    timerInt = setInterval(() => {
      const sec = Math.floor((Date.now() - startTs) / 1000);
      ui.onTick && ui.onTick(sec);
      if (sec >= MAX_SECONDS) stop();
    }, 250);

    /* 音量 → 呼吸球 */
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const src = audioCtx.createMediaStreamSource(stream);
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      src.connect(analyser);
      const buf = new Uint8Array(analyser.frequencyBinCount);
      levelInt = setInterval(() => {
        analyser.getByteFrequencyData(buf);
        let sum = 0;
        for (let i = 0; i < buf.length; i++) sum += buf[i];
        const level = Math.min(1, (sum / buf.length) / 90);
        ui.onLevel && ui.onLevel(level);
      }, 80);
    } catch (e) { /* 音量可视化失败不影响录音 */ }

    ui.onStart && ui.onStart();
    return true;
  }

  /* ---- 停止并产出 clip ---- */
  function release() {
    clearInterval(timerInt);
    clearInterval(levelInt);
    if (audioCtx) { audioCtx.close().catch(() => {}); audioCtx = null; }
    if (stream) { stream.getTracks().forEach(t => { t.onended = null; t.stop(); }); stream = null; }
  }

  function stop() {
    if (state === 'requesting') {
      generation++;
      state = 'idle';
      activeUI.onError && activeUI.onError('已取消麦克风请求。');
      return Promise.resolve(null);
    }
    if (stopPromise) return stopPromise;
    if (!recorder) return Promise.resolve(pendingClip);
    stopPromise = new Promise(resolve => { finishStop = resolve; });
    const result = stopPromise;
    state = 'stopping';
    stopTs = Date.now();
    clearInterval(timerInt);
    activeUI.onFinishing && activeUI.onFinishing();
    if (recorder.state !== 'inactive') recorder.stop();
    return result;
  }

  function isRecording() { return state !== 'idle'; }
  function getPending() { return pendingClip; }
  function clearPending() { pendingClip = null; }
  function setPending(clip) { pendingClip = clip; }
  function stopPlayback() { if (playingAudio) { playingAudio.pause(); playingAudio = null; } }
  function download(clip = pendingClip) {
    if (!clip) return;
    const link = document.createElement('a');
    link.href = clip.dataUrl;
    const ext = clip.dataUrl.startsWith('data:audio/mp4') ? 'm4a' : clip.dataUrl.startsWith('data:audio/ogg') ? 'ogg' : 'webm';
    link.download = `枕梦索-声音-${Date.now()}.${ext}`;
    link.click();
  }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { stopPlayback(); if (isRecording()) stop(); }
  });

  /* ---- 详情页播放器：一弯发光的进度弧 ---- */
  function renderPlayer(container, clip) {
    stopPlayback();
    if (!clip || !clip.dataUrl) return;
    container.innerHTML = `
      <div class="voice-player" id="voicePlayer">
        <button class="vp-orb" id="vpOrb" aria-label="播放语音">
          <svg viewBox="0 0 60 60" width="60" height="60">
            <circle cx="30" cy="30" r="26" fill="none"
                    stroke="rgba(167,139,250,0.18)" stroke-width="2.5"/>
            <circle id="vpRing" cx="30" cy="30" r="26" fill="none"
                    stroke="url(#vpGrad)" stroke-width="2.5"
                    stroke-linecap="round"
                    stroke-dasharray="163.4" stroke-dashoffset="163.4"
                    transform="rotate(-90 30 30)"/>
            <defs>
              <linearGradient id="vpGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stop-color="#9D80FF"/>
                <stop offset="100%" stop-color="#FF8FB8"/>
              </linearGradient>
            </defs>
          </svg>
          <span class="vp-icon" id="vpIcon">▶</span>
        </button>
        <div class="vp-info">
          <div class="vp-title">这一段，是说出来的梦</div>
          <div class="vp-time"><span id="vpCur">0:00</span> / ${fmtTime(clip.duration)}</div>
        </div>
      </div>
    `;

    const audio = new Audio(clip.dataUrl);
    playingAudio = audio;
    const orb = container.querySelector('#vpOrb');
    const icon = container.querySelector('#vpIcon');
    const ring = container.querySelector('#vpRing');
    const cur = container.querySelector('#vpCur');
    const CIRC = 163.4;

    orb.addEventListener('click', async () => {
      if (audio.paused) {
        try { await audio.play(); } catch { cur.textContent = '无法播放'; return; }
        icon.textContent = '❚❚';
        orb.setAttribute('aria-label', '暂停语音');
        orb.classList.add('is-playing');
      } else {
        audio.pause();
        icon.textContent = '▶';
        orb.setAttribute('aria-label', '播放语音');
        orb.classList.remove('is-playing');
      }
    });
    audio.addEventListener('timeupdate', () => {
      const p = audio.duration ? audio.currentTime / audio.duration : 0;
      ring.style.strokeDashoffset = String(CIRC * (1 - p));
      cur.textContent = fmtTime(Math.floor(audio.currentTime));
    });
    audio.addEventListener('ended', () => {
      icon.textContent = '▶';
      orb.setAttribute('aria-label', '播放语音');
      orb.classList.remove('is-playing');
      ring.style.strokeDashoffset = String(CIRC);
    });
  }

  function fmtTime(sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  return { supported, start, stop, isRecording, getPending, clearPending, setPending, renderPlayer, fmtTime, stopPlayback, download };
})();

import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

const source = name => readFileSync(new URL('../js/' + name + '.js', import.meta.url), 'utf8');
function storageContext() {
  const data = new Map();
  const ctx = vm.createContext({ console, Date, Intl, Math, localStorage: {
    getItem: key => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, value),
    removeItem: key => data.delete(key),
  }});
  vm.runInContext(source('storage') + ';globalThis.store=Storage; globalThis.utils=Utils;', ctx);
  return { ctx, data, store: ctx.store, utils: ctx.utils };
}

test('正式记录按 id 更新，草稿不进入日记', () => {
  const {store} = storageContext();
  store.saveDraft({title:'虚构草稿', body:'蓝色走廊'});
  assert.equal(store.getDreams().length, 0);
  store.saveDream({id:'fixture',createdAt:1,body:'第一版'});
  store.saveDream({id:'fixture',createdAt:1,body:'补写'});
  assert.equal(store.getDreams().length, 1);
  assert.equal(store.getDreamById('fixture').body, '补写');
  store.clearDraft();
  assert.equal(store.getDraft(), null);
});

test('空间不足抛出错误，原记录保持不变', () => {
  const {store,ctx} = storageContext();
  store.saveDream({id:'fixture',createdAt:1,body:'原内容'});
  ctx.localStorage.setItem = () => { throw new Error('QuotaExceededError'); };
  assert.throws(() => store.saveDream({id:'fixture',createdAt:1,body:'新内容'}), /未能保存/);
  assert.equal(store.getDreamById('fixture').body, '原内容');
  assert.throws(() => store.saveDraft({body:'草稿'}), /未能保存/);
  assert.throws(() => store.setUser({name:'测试'}), /未能保存/);
});

test('损坏的数据不能被空列表覆盖', () => {
  const {data,store} = storageContext();
  data.set(store.KEYS.DREAMS, '{broken');
  assert.equal(store.getDreams().length, 0);
  assert.equal(store.dreamReadError, true);
  assert.throws(() => store.saveDream({id:'x',createdAt:2}), /避免覆盖/);
  assert.throws(() => store.deleteDream('x'), /停止删除/);
  assert.equal(data.get(store.KEYS.DREAMS), '{broken');
});

test('月相使用毫秒且早于参考日也保持范围', () => {
  const {utils} = storageContext();
  const base = Date.parse('2000-01-06T18:14:00Z');
  assert.equal(utils.moonPhase(new Date(base)).name, '新月');
  assert.equal(utils.moonPhase(new Date(base + 2551443000 / 2)).name, '满月');
  assert.ok(utils.moonPhase(new Date(base - 86400000)).phaseValue >= 0);
});

function voiceContext(options = {}) {
  let stopped = 0, now = 0, next = 0;
  const timers = new Map();
  const tracks = [{stop: () => stopped++, onended: null}];
  class Recorder {
    static isTypeSupported(type) { return type === 'audio/mp4'; }
    constructor(stream, settings) { this.mimeType = settings?.mimeType; this.state = 'inactive'; }
    start() { if (options.startError) throw new Error(); this.state = 'recording'; }
    stop() {
      this.state = 'inactive';
      queueMicrotask(() => { this.ondataavailable({data:new Blob(['fictional audio'])}); this.onstop(); });
    }
  }
  class Reader {
    readAsDataURL() { this.result = 'data:audio/mp4;base64,ZmljdGlvbg=='; queueMicrotask(() => this.onload()); }
  }
  const document = {hidden:false,addEventListener() {}};
  const ctx = vm.createContext({ console, Blob, FileReader:Reader, MediaRecorder:Recorder,
    Date:{now:() => now}, Math, Uint8Array, document,
    window:{MediaRecorder:Recorder}, navigator:{mediaDevices:{getUserMedia: options.getUserMedia || (async () => ({getTracks:() => tracks}))}},
    setInterval: fn => {timers.set(++next,fn);return next;}, clearInterval: id => timers.delete(id),
  });
  vm.runInContext(source('voice') + ';globalThis.voice=Voice;',ctx);
  return {voice:ctx.voice, timers, stopped:() => stopped, advance:n => now=n, document};
}

test('录音结束后才产出待保存声音，多次停止只回调一次', async () => {
  const {voice,stopped} = voiceContext();
  let completed = 0;
  await voice.start({onStop:() => completed++});
  assert.equal(voice.getPending(), null);
  const first = voice.stop();
  assert.equal(voice.stop(), first);
  const clip = await first;
  assert.equal(clip.mimeType, 'audio/mp4');
  assert.equal(completed, 1);
  assert.equal(voice.isRecording(), false);
  assert.equal(stopped(), 1);
});

test('两分钟自动停止也完成 UI 回调并释放麦克风', async () => {
  const {voice,timers,advance,stopped} = voiceContext();
  let complete = false;
  await voice.start({onStop:() => complete=true});
  advance(120000);
  [...timers.values()][0]();
  await voice.stop();
  assert.equal(complete, true);
  assert.equal(voice.getPending().duration, 120);
  assert.equal(stopped(), 1);
  assert.equal(timers.size, 0);
});

test('取消权限请求后，迟到的麦克风授权立即释放', async () => {
  let resolve, released = 0;
  const {voice} = voiceContext({getUserMedia: () => new Promise(r => resolve=r)});
  const starting = voice.start({});
  await voice.stop();
  resolve({getTracks:() => [{stop:() => released++}]});
  assert.equal(await starting, false);
  assert.equal(released, 1);
  assert.equal(voice.isRecording(), false);
});

test('拒绝权限与启动失败均恢复空闲状态', async () => {
  for (const options of [{getUserMedia:async () => {throw new Error();}}, {startError:true}]) {
    const {voice} = voiceContext(options);
    let error = '';
    assert.equal(await voice.start({onError:msg => error=msg}), false);
    assert.ok(error);
    assert.equal(voice.isRecording(), false);
  }
});

function formContext() {
  const base = storageContext();
  const elements = new Map();
  const element = id => {
    if (!elements.has(id)) elements.set(id, {value:'', textContent:'', innerHTML:'', disabled:false,
      style:{setProperty(){}}, dispatchEvent(){}, appendChild(){}, setAttribute(){},
      animate:() => ({}), addEventListener(){}, querySelectorAll:() => [], remove(){}});
    return elements.get(id);
  };
  element('writeClarity').value = '50';
  element('writeSleep').value = '23:00';
  element('writeWake').value = '07:00';
  let pending = null;
  Object.assign(base.ctx, {
    document:{getElementById:element, querySelector:() => null, querySelectorAll:() => [],
      createElement:() => element('particle'),body:{appendChild(){}}},
    Voice:{getPending:() => pending,setPending:c => pending=c,clearPending:() => pending=null,
      isRecording:() => false,fmtTime:() => '0:01'},
    window:{innerWidth:1000,innerHeight:800}, Event:class {},
    App:{go(){}}, Starfield:{maybeShootingStar(){}}, setTimeout:() => 1, confirm:() => true,
  });
  vm.runInContext(source('dreams') + ';globalThis.dreams=Dreams;',base.ctx);
  base.ctx.dreams.restoreDraft();
  return {...base,element,dreams:base.ctx.dreams,voice:base.ctx.Voice};
}

test('纯录音可以正式保存且只在写入成功后清空', () => {
  const {dreams,voice,store} = formContext();
  voice.setPending({dataUrl:'data:audio/mp4;base64,Zg==',duration:1});
  dreams.saveWriteForm();
  assert.equal(store.getDreams().length, 1);
  assert.ok(store.getDreams()[0].audio);
  assert.equal(voice.getPending(), null);
});

test('表单写入失败不清空文字或待保存录音', () => {
  const {dreams,voice,element,ctx} = formContext();
  element('writeBody').value = '虚构内容';
  voice.setPending({dataUrl:'data:audio/mp4;base64,Zg==',duration:1});
  ctx.localStorage.setItem = () => { throw new Error('full'); };
  dreams.saveWriteForm();
  assert.equal(element('writeBody').value, '虚构内容');
  assert.ok(voice.getPending());
  assert.match(element('writeStatus').textContent, /未能保存/);
});

test('编辑中移除旧录音后，保存不会让声音重新出现', () => {
  const {dreams,voice,store} = formContext();
  store.saveDream({id:'fixture',createdAt:1,title:'虚构',body:'走廊',tags:[],audio:{duration:1,dataUrl:'data:audio/mp4;base64,Zg=='}});
  dreams.startEdit('fixture');
  voice.clearPending();
  dreams.saveWriteForm();
  assert.equal(store.getDreams().length, 1);
  assert.equal(store.getDreamById('fixture').audio, null);
  assert.equal(store.getDreamById('fixture').createdAt, 1);
});

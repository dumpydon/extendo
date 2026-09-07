// Dependency-free lifecycle tests for the isolated content script.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const source = fs.readFileSync('content/stdin-resizer.js', 'utf8');
function fixture(saved = {}) {
  let mutation, resize, storageListener;
  const frames = [];
  const values = { ...saved };
  class Element {
    constructor(classes = '') {
      this.classes = new Set(classes.split(' ')); this.attrs = {}; this.events = {};
      this.isConnected = true; this.clientHeight = 800;
      this.classList = { contains: c => this.classes.has(c), add: c => this.classes.add(c), remove: c => this.classes.delete(c) };
      const styles = new Map();
      this.style = { getPropertyValue: k => styles.get(k), setProperty: (k,v) => styles.set(k,v), removeProperty: k => styles.delete(k) };
    }
    set className(v) { this.classes = new Set(v.split(' ')); }
    setAttribute(k,v) { this.attrs[k] = v; }
    addEventListener(k,cb) { this.events[k] = cb; }
    prepend(el) { this.handle = el; el.parentElement = this; }
    remove() { this.isConnected = false; this.parentElement = null; }
    setPointerCapture(id) { this.capture = id; }
    hasPointerCapture(id) { return this.capture === id; }
    releasePointerCapture() { this.capture = null; }
    focus() {}
    fire(type, extra = {}) { this.events[type]?.({button:0,pointerId:1,clientY:600,preventDefault(){},stopPropagation(){},...extra}); }
  }
  const pane = new Element('console-base show-stdin');
  const input = new Element('console-input-base'), textarea = new Element(), result = new Element();
  input.querySelector = () => textarea;
  pane.querySelector = s => s.includes('console-input') ? input : result;
  const root = new Element();
  const document = { documentElement: root, querySelectorAll: () => pane.isConnected ? [pane] : [], createElement: () => new Element() };
  vm.runInNewContext(source, { document, window: {addEventListener(){},removeEventListener(){}},
    requestAnimationFrame: cb => frames.push(cb),
    MutationObserver: class { constructor(cb){mutation=cb} observe(){} },
    ResizeObserver: class { constructor(cb){resize=cb} observe(){} disconnect(){} },
    chrome: { storage: { onChanged: {addListener(cb){storageListener=cb}}, local: {
      get(keys, cb){cb(values)}, set(obj){Object.assign(values,obj);storageListener(Object.fromEntries(Object.entries(obj).map(([k,v])=>[k,{newValue:v}])),'local')}
    } } }
  });
  function flush(){let count=0;while(frames.length){assert.ok(++count<10,'no runaway scheduling');frames.shift()()}}
  flush();
  return {pane,input,root,values,flush,resize:()=>resize(),
    mutate:()=>{mutation([{type:'childList'}]);flush()},
    set:(key,val)=>{storageListener({[key]:{newValue:val}},'local');flush()}};
}
test('upward drag changes height, clamps to pane and saves on release',()=>{
  const f=fixture(), h=f.input.handle;
  h.fire('pointerdown');h.fire('pointermove',{clientY:350});
  assert.equal(f.pane.style.getPropertyValue('--extendo-stdin-height'),'450px');
  h.fire('pointermove',{clientY:-500});h.fire('pointerup');f.flush();
  assert.equal(f.values.extendo_stdin_height,700);
  assert.equal(f.root.classList.contains('extendo-resizing-stdin'),false);
});
test('feature toggle removes overrides and restores preferred height on re-enable',()=>{
  const f=fixture({extendo_stdin_height:350});
  f.set('extendo_stdin_resize_enabled',false);
  assert.equal(f.input.handle.isConnected,false);
  assert.equal(f.pane.style.getPropertyValue('--extendo-stdin-height'),undefined);
  f.set('extendo_stdin_resize_enabled',true);
  assert.equal(f.pane.style.getPropertyValue('--extendo-stdin-height'),'350px');
  f.set('extendo_enabled',false);
  assert.equal(f.pane.classList.contains('extendo-stdin-enabled'),false);
});
test('disabled startup, collapse/reopen, replacement and viewport clamping',()=>{
  const f=fixture({extendo_stdin_resize_enabled:false,extendo_stdin_height:600});
  assert.equal(f.input.handle,undefined);
  f.set('extendo_stdin_resize_enabled',true);
  f.pane.classList.remove('show-stdin');f.mutate();assert.equal(f.input.handle.hidden,true);
  f.pane.classList.add('show-stdin');f.mutate();assert.equal(f.input.handle.hidden,false);
  const previous=f.input.handle;previous.parentElement=null;f.mutate();
  assert.notEqual(previous,f.input.handle);
  f.pane.clientHeight=400;f.resize();
  assert.equal(f.pane.style.getPropertyValue('--extendo-stdin-height'),'300px');
  f.pane.clientHeight=800;f.resize();
  assert.equal(f.pane.style.getPropertyValue('--extendo-stdin-height'),'600px');
});
test('keyboard, reset and cancellation persist and release drag state',()=>{
  const f=fixture(),h=f.input.handle;
  h.fire('keydown',{key:'ArrowUp'});f.flush();assert.equal(f.values.extendo_stdin_height,210);
  h.fire('keydown',{key:'Home'});f.flush();assert.equal(f.values.extendo_stdin_height,48);
  h.fire('dblclick');f.flush();assert.equal(f.values.extendo_stdin_height,200);
  h.fire('pointerdown');h.fire('pointermove',{clientY:500});h.fire('pointercancel');f.flush();
  assert.equal(f.values.extendo_stdin_height,300);
  assert.equal(f.root.classList.contains('extendo-resizing-stdin'),false);
});

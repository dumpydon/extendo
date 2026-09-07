// Dependency-free lifecycle tests for the isolated content script.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const source = fs.readFileSync('content/column-resizer.js', 'utf8');
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
    appendChild(el) { this.handle = el; el.parentElement = this; }
    getBoundingClientRect() { return { left: 100, width: 1200 }; }
    prepend(el) { this.handle = el; el.parentElement = this; }
    remove() { this.isConnected = false; this.parentElement = null; }
    setPointerCapture(id) { this.capture = id; }
    hasPointerCapture(id) { return this.capture === id; }
    releasePointerCapture() { this.capture = null; }
    focus() {}
    fire(type, extra = {}) { this.events[type]?.({button:0,pointerId:1,clientY:600,preventDefault(){},stopPropagation(){},...extra}); }
  }
  const pane = new Element('row'), editor = new Element('editor-base'), consolePane = new Element('console-base');
  editor.parentElement = pane; consolePane.parentElement = pane;
  pane.querySelector = s => s.includes('editor-base') ? editor : consolePane;
  const root = new Element();
  const document = { documentElement: root, querySelectorAll: () => pane.isConnected ? [pane] : [], createElement: () => new Element() };
  vm.runInNewContext(source, { document, window: {addEventListener(){},removeEventListener(){},dispatchEvent(){}},
    Event: class {}, requestAnimationFrame: cb => frames.push(cb),
    MutationObserver: class { constructor(cb){mutation=cb} observe(){} },
    ResizeObserver: class { constructor(cb){resize=cb} observe(){} disconnect(){} },
    chrome: { storage: { onChanged: {addListener(cb){storageListener=cb}}, local: {
      get(keys, cb){cb(values)}, set(obj){Object.assign(values,obj);storageListener(Object.fromEntries(Object.entries(obj).map(([k,v])=>[k,{newValue:v}])),'local')}
    } } }
  });
  function flush(){let count=0;while(frames.length){assert.ok(++count<10,'no runaway scheduling');frames.shift()()}}
  flush();
  return {pane,editor,consolePane,root,values,flush,
    mutate:()=>{mutation([{type:'childList'}]);flush()},
    set:(key,val)=>{storageListener({[key]:{newValue:val}},'local');flush()}};
}
test('pointer drag clamps at 40% and preserves the 83.33% right limit',()=>{
  const f=fixture(), h=f.pane.handle;
  h.fire('pointerdown',{clientX:800});h.fire('pointermove',{clientX:200});
  assert.equal(h.attrs['aria-valuenow'],'40');
  h.fire('pointermove',{clientX:1500});h.fire('pointerup');f.flush();
  assert.ok(Math.abs(f.values.extendo_column_ratio-5/6)<1e-12);
  assert.equal(f.editor.parentElement,f.pane);
  assert.equal(f.consolePane.parentElement,f.pane);
  assert.equal(f.root.classList.contains('extendo-resizing-columns'),false);
});
test('toggle cleanup, saved restoration and master pause',()=>{
  const f=fixture({extendo_column_ratio:.75});
  f.set('extendo_column_resize_enabled',false);
  assert.equal(f.pane.style.getPropertyValue('--extendo-code-width'),undefined);
  assert.equal(f.pane.handle.isConnected,false);
  f.set('extendo_column_resize_enabled',true);
  assert.equal(f.pane.handle.attrs['aria-valuenow'],'75');
  f.set('extendo_enabled',false);
  assert.equal(f.pane.classList.contains('extendo-columns-enabled'),false);
});
test('keyboard, reset, remount and invalid saved ratios',()=>{
  const f=fixture({extendo_column_ratio:Infinity}),h=f.pane.handle;
  assert.equal(h.attrs['aria-valuenow'],'58.33');
  h.fire('keydown',{key:'ArrowRight',shiftKey:true});f.flush();
  assert.equal(h.attrs['aria-valuenow'],'63.33');
  h.fire('keydown',{key:'Home'});f.flush();assert.equal(h.attrs['aria-valuenow'],'40');
  h.fire('dblclick');f.flush();assert.equal(h.attrs['aria-valuenow'],'58.33');
  h.parentElement=null;f.mutate();assert.notEqual(f.pane.handle,h);
  f.set('extendo_column_ratio',100);assert.equal(f.pane.handle.attrs['aria-valuenow'],'83.33');
});

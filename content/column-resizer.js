/* Isolated-world column divider for the legacy Playground iframe. */
(() => {
  'use strict';
  const DEFAULT_RATIO = 7 / 12;
  const MIN_RATIO = 0.4;
  // Keep the right limit independent of the left limit.
  const MAX_RATIO = 5 / 6;
  const ENABLE_KEY = 'extendo_column_resize_enabled';
  const RATIO_KEY = 'extendo_column_ratio';
  const clamp = value => Math.min(MAX_RATIO, Math.max(MIN_RATIO,
    Number.isFinite(value) ? value : DEFAULT_RATIO));
  let enabled = true, masterEnabled = true, preferredRatio = DEFAULT_RATIO;
  let scheduled = false;
  const layouts = new Map();

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => { scheduled = false; reconcile(); });
  }
  function save(ratio) {
    preferredRatio = ratio;
    chrome.storage.local.set({ [RATIO_KEY]: ratio });
  }
  function mount(row, editor, consolePane) {
    const handle = document.createElement('div');
    handle.className = 'extendo-column-resizer';
    handle.tabIndex = 0;
    handle.setAttribute('role', 'separator');
    handle.setAttribute('aria-label', 'Resize code and output columns');
    handle.setAttribute('aria-orientation', 'vertical');
    handle.setAttribute('aria-valuemin', String(MIN_RATIO * 100));
    handle.setAttribute('aria-valuemax', String(MAX_RATIO * 100));
    handle.title = 'Drag left/right to resize columns (40%–83.33%). Arrow keys resize; double-click resets.';
    row.appendChild(handle);
    row.classList.add('extendo-columns-enabled');
    let ratio = preferredRatio, drag = null, refreshPending = false;

    function refreshEditor() {
      if (refreshPending) return;
      refreshPending = true;
      requestAnimationFrame(() => {
        refreshPending = false;
        // CodeMirror's own window resize listener remeasures its viewport.
        // No editor contents, selections or page internals are modified.
        window.dispatchEvent(new Event('resize'));
      });
    }
    function apply(value) {
      ratio = clamp(value);
      const width = `${ratio * 100}%`;
      if (row.style.getPropertyValue('--extendo-code-width') !== width) {
        row.style.setProperty('--extendo-code-width', width);
        refreshEditor();
      }
      handle.setAttribute('aria-valuenow', String(Math.round(ratio * 10000) / 100));
      handle.setAttribute('aria-valuetext', `${Math.round(ratio * 100)}% code, ${Math.round((1-ratio) * 100)}% output`);
    }
    function stop(persist = false) {
      if (!drag) return;
      const id = drag.id;
      drag = null;
      if (handle.hasPointerCapture(id)) handle.releasePointerCapture(id);
      handle.classList.remove('extendo-dragging');
      document.documentElement.classList.remove('extendo-resizing-columns');
      if (persist) save(ratio);
    }
    handle.addEventListener('pointerdown', event => {
      if (event.button !== 0 || !enabled || !masterEnabled) return;
      event.preventDefault(); event.stopPropagation();
      const bounds = row.getBoundingClientRect();
      drag = { id: event.pointerId, offset: event.clientX - (bounds.left + ratio * bounds.width) };
      handle.setPointerCapture(event.pointerId);
      handle.focus({ preventScroll: true });
      handle.classList.add('extendo-dragging');
      document.documentElement.classList.add('extendo-resizing-columns');
    });
    handle.addEventListener('pointermove', event => {
      if (!drag || event.pointerId !== drag.id) return;
      event.preventDefault(); event.stopPropagation();
      const bounds = row.getBoundingClientRect();
      if (bounds.width > 0) apply((event.clientX - bounds.left - drag.offset) / bounds.width);
    });
    handle.addEventListener('pointerup', () => stop(true));
    handle.addEventListener('pointercancel', () => stop(true));
    handle.addEventListener('lostpointercapture', () => stop(true));
    const blur = () => stop(true);
    window.addEventListener('blur', blur);
    handle.addEventListener('dblclick', event => {
      event.preventDefault(); event.stopPropagation();
      apply(DEFAULT_RATIO); save(ratio);
    });
    handle.addEventListener('keydown', event => {
      const step = event.shiftKey ? 0.05 : 0.01;
      const values = { ArrowLeft: ratio - step, ArrowRight: ratio + step, Home: MIN_RATIO, End: MAX_RATIO };
      if (!(event.key in values)) return;
      event.preventDefault(); event.stopPropagation();
      apply(values[event.key]); save(ratio);
    });
    apply(preferredRatio);
    return {
      editor, consolePane, handle,
      update() { if (!drag) apply(preferredRatio); },
      destroy() {
        stop(false);
        window.removeEventListener('blur', blur);
        handle.remove();
        row.classList.remove('extendo-columns-enabled');
        row.style.removeProperty('--extendo-code-width');
        refreshEditor();
      }
    };
  }
  function reconcile() {
    for (const [row, layout] of layouts) {
      if (!enabled || !masterEnabled || !row.isConnected ||
          layout.editor.parentElement !== row || layout.consolePane.parentElement !== row ||
          layout.handle.parentElement !== row) {
        layout.destroy(); layouts.delete(row);
      }
    }
    if (!enabled || !masterEnabled) return;
    for (const row of document.querySelectorAll('.playground-base > .row')) {
      const editor = row.querySelector(':scope > .editor-base');
      const consolePane = row.querySelector(':scope > .console-base');
      if (!editor || !consolePane) continue;
      if (!layouts.has(row)) layouts.set(row, mount(row, editor, consolePane));
      layouts.get(row).update();
    }
  }
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    if (changes[ENABLE_KEY]) enabled = changes[ENABLE_KEY].newValue !== false;
    if (changes.extendo_enabled) masterEnabled = changes.extendo_enabled.newValue !== false;
    if (changes[RATIO_KEY]) preferredRatio = clamp(changes[RATIO_KEY].newValue);
    schedule();
  });
  chrome.storage.local.get([ENABLE_KEY, RATIO_KEY, 'extendo_enabled'], values => {
    enabled = values[ENABLE_KEY] !== false;
    masterEnabled = values.extendo_enabled !== false;
    preferredRatio = clamp(values[RATIO_KEY]);
    new MutationObserver(schedule).observe(document, { childList: true, subtree: true });
    schedule();
  });
})();

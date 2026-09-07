/* Runs in the isolated world in every playground frame. No page-script bridge
 * is needed: preferences and drag height are read directly from extension storage. */
(() => {
  'use strict';
  const DEFAULT_HEIGHT = 200;
  const MIN_HEIGHT = 48;
  const HEIGHT_KEY = 'extendo_stdin_height';
  const ENABLE_KEY = 'extendo_stdin_resize_enabled';
  let enabled = true;
  let masterEnabled = true;
  let preferredHeight = DEFAULT_HEIGHT;
  let scheduled = false;
  const panels = new Map();

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      reconcile();
    });
  }

  function persistHeight(height) {
    preferredHeight = height;
    chrome.storage.local.set({ [HEIGHT_KEY]: height });
  }

  function mount(pane, input, textarea) {
    const handle = document.createElement('div');
    handle.className = 'extendo-stdin-resizer';
    handle.tabIndex = 0;
    handle.setAttribute('role', 'separator');
    handle.setAttribute('aria-label', 'Resize STDIN');
    handle.setAttribute('aria-orientation', 'horizontal');
    handle.title = 'Drag up/down to resize STDIN. Arrow keys resize; double-click resets.';
    input.prepend(handle);
    let drag = null;
    let currentHeight = DEFAULT_HEIGHT;

    function limits() {
      // Leave room for the output header and the existing STDIN button.
      return Math.max(MIN_HEIGHT, Math.floor(pane.clientHeight - 100));
    }
    function apply(height) {
      currentHeight = Math.min(limits(), Math.max(MIN_HEIGHT, Math.round(height)));
      const value = `${currentHeight}px`;
      if (pane.style.getPropertyValue('--extendo-stdin-height') !== value) {
        pane.style.setProperty('--extendo-stdin-height', value);
      }
      handle.setAttribute('aria-valuemin', String(MIN_HEIGHT));
      handle.setAttribute('aria-valuemax', String(limits()));
      handle.setAttribute('aria-valuenow', String(currentHeight));
      handle.setAttribute('aria-valuetext', `${currentHeight} pixels high`);
    }
    function stop(save = false) {
      if (!drag) return;
      const id = drag.id;
      drag = null;
      if (handle.hasPointerCapture(id)) handle.releasePointerCapture(id);
      handle.classList.remove('extendo-dragging');
      document.documentElement.classList.remove('extendo-resizing-stdin');
      if (save) persistHeight(currentHeight);
    }
    handle.addEventListener('pointerdown', event => {
      if (event.button !== 0 || !enabled || !masterEnabled) return;
      event.preventDefault();
      event.stopPropagation();
      drag = { id: event.pointerId, y: event.clientY, height: currentHeight };
      handle.setPointerCapture(event.pointerId);
      handle.focus({ preventScroll: true });
      handle.classList.add('extendo-dragging');
      document.documentElement.classList.add('extendo-resizing-stdin');
    });
    handle.addEventListener('pointermove', event => {
      if (!drag || event.pointerId !== drag.id) return;
      event.preventDefault();
      event.stopPropagation();
      apply(drag.height + drag.y - event.clientY);
    });
    handle.addEventListener('pointerup', () => stop(true));
    handle.addEventListener('pointercancel', () => stop(true));
    handle.addEventListener('lostpointercapture', () => stop(true));
    const blur = () => stop(true);
    window.addEventListener('blur', blur);
    handle.addEventListener('dblclick', event => {
      event.preventDefault();
      event.stopPropagation();
      apply(DEFAULT_HEIGHT);
      persistHeight(DEFAULT_HEIGHT);
    });
    handle.addEventListener('keydown', event => {
      const step = event.shiftKey ? 50 : 10;
      const heights = { ArrowUp: currentHeight + step, ArrowDown: currentHeight - step,
        Home: MIN_HEIGHT, End: limits() };
      if (!(event.key in heights)) return;
      event.preventDefault();
      event.stopPropagation();
      apply(heights[event.key]);
      persistHeight(currentHeight);
    });
    const resizeObserver = new ResizeObserver(() => apply(preferredHeight));
    resizeObserver.observe(pane);
    return {
      input, textarea, handle,
      update() {
        const open = pane.classList.contains('show-stdin');
        if (!open) stop(true);
        handle.hidden = !open;
        if (!pane.classList.contains('extendo-stdin-enabled')) pane.classList.add('extendo-stdin-enabled');
        if (!drag) apply(preferredHeight);
      },
      destroy() {
        stop(false);
        resizeObserver.disconnect();
        window.removeEventListener('blur', blur);
        handle.remove();
        pane.classList.remove('extendo-stdin-enabled');
        pane.style.removeProperty('--extendo-stdin-height');
      }
    };
  }

  function reconcile() {
    for (const [pane, panel] of panels) {
      if (!enabled || !masterEnabled || !pane.isConnected ||
          !panel.input.isConnected || !panel.textarea.isConnected ||
          panel.handle.parentElement !== panel.input) {
        panel.destroy();
        panels.delete(pane);
      }
    }
    if (!enabled || !masterEnabled) return;
    // These are the actual legacy Playground containers, inside its iframe.
    // Never select or restyle the editor column or horizontal split widths.
    for (const pane of document.querySelectorAll('.console-base')) {
      const input = pane.querySelector(':scope > .console-input-base');
      const textarea = input?.querySelector('textarea');
      if (!textarea || !pane.querySelector(':scope > .result')) continue;
      if (!panels.has(pane)) panels.set(pane, mount(pane, input, textarea));
      panels.get(pane).update();
    }
  }

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    if (changes[ENABLE_KEY]) enabled = changes[ENABLE_KEY].newValue !== false;
    if (changes.extendo_enabled) masterEnabled = changes.extendo_enabled.newValue !== false;
    if (changes[HEIGHT_KEY]) {
      const height = changes[HEIGHT_KEY].newValue;
      preferredHeight = Number.isFinite(height) ? height : DEFAULT_HEIGHT;
    }
    schedule();
  });
  chrome.storage.local.get([ENABLE_KEY, HEIGHT_KEY, 'extendo_enabled'], values => {
    enabled = values[ENABLE_KEY] !== false;
    masterEnabled = values.extendo_enabled !== false;
    preferredHeight = Number.isFinite(values[HEIGHT_KEY]) ? values[HEIGHT_KEY] : DEFAULT_HEIGHT;
    const observer = new MutationObserver(records => {
      if (records.some(record => record.type === 'childList' ||
          (record.target.matches?.('.console-base') && record.attributeName === 'class'))) schedule();
    });
    observer.observe(document, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
    schedule();
  });
})();

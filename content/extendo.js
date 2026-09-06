/**
 * Extendo - LeetCode Playground & Editor Shortcuts (v1.4.6)
 * Universal Code Editor Keybinding Suite & LeetCode Dark Theme Engine
 * 
 * Supports:
 * - CodeMirror 5 (LeetCode Playground: leetcode.com/playground/*)
 * - Monaco Editor (LeetCode Problem Code Editor)
 * - CodeMirror 6 & Ace Editor
 */

(function () {
  'use strict';

  // Strictly restrict execution to LeetCode Playground pages only!
  const isPlayground = window.location.pathname.startsWith('/playground') || 
                       window.location.href.includes('/playground');
  if (!isPlayground) {
    return;
  }

  if (window.__EXTENDO_MAIN_INITIALIZED__) {
    return;
  }
  window.__EXTENDO_MAIN_INITIALIZED__ = true;

  console.log('%c[Extendo] LeetCode Playground Shortcuts & Theme Engine Active! ⚡', 'color: #ffa116; font-weight: bold; font-size: 13px;');

  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0 ||
                navigator.userAgent.toUpperCase().indexOf('MAC') >= 0;

  /* ==========================================================================
     State & Toggle Management
     ========================================================================== */

  let isEnabled = true;

  // Restore cached state from document attribute, sessionStorage, or localStorage
  try {
    const attr = document.documentElement ? document.documentElement.getAttribute('data-extendo-enabled') : null;
    if (attr !== null) {
      isEnabled = attr === 'true';
    } else {
      const saved = localStorage.getItem('extendo_enabled') || sessionStorage.getItem('extendo_enabled');
      if (saved !== null) {
        isEnabled = saved === 'true';
      }
    }
  } catch (_) {}

  // Restore cached theme ONLY if extension is enabled; otherwise force light mode!
  try {
    if (document.documentElement) {
      if (!isEnabled) {
        document.documentElement.setAttribute('data-extendo-theme', 'light');
      } else if (!document.documentElement.hasAttribute('data-extendo-theme')) {
        const savedTheme = localStorage.getItem('extendo_theme') || sessionStorage.getItem('extendo_theme');
        if (savedTheme === 'dark' || savedTheme === 'light') {
          document.documentElement.setAttribute('data-extendo-theme', savedTheme);
        } else {
          const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
          document.documentElement.setAttribute('data-extendo-theme', prefersDark ? 'dark' : 'light');
        }
      }
    }
  } catch (_) {}

  // Restore cached strip color (default: blue)
  try {
    if (document.documentElement && !document.documentElement.hasAttribute('data-extendo-strip')) {
      const savedStrip = localStorage.getItem('extendo_strip_color') || sessionStorage.getItem('extendo_strip_color') || 'blue';
      document.documentElement.setAttribute('data-extendo-strip', savedStrip);
    }
  } catch (_) {}

  function updateEnabledState(newVal) {
    isEnabled = newVal !== false;
    const strVal = isEnabled ? 'true' : 'false';

    try {
      localStorage.setItem('extendo_enabled', strVal);
      sessionStorage.setItem('extendo_enabled', strVal);
    } catch (_) {}

    try {
      if (document.documentElement) {
        if (document.documentElement.getAttribute('data-extendo-enabled') !== strVal) {
          document.documentElement.setAttribute('data-extendo-enabled', strVal);
        }
        // If extension is toggled OFF, immediately revert to light theme!
        if (!isEnabled) {
          document.documentElement.setAttribute('data-extendo-theme', 'light');
        } else {
          const savedTheme = localStorage.getItem('extendo_theme') || sessionStorage.getItem('extendo_theme') || 'system';
          const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
          const effective = savedTheme === 'dark' ? 'dark' : (savedTheme === 'light' ? 'light' : (prefersDark ? 'dark' : 'light'));
          document.documentElement.setAttribute('data-extendo-theme', effective);
        }
      }
    } catch (_) {}

    try {
      setupStdinResizer();
    } catch (_) {}

    console.log(`%c[Extendo] Extension is now ${isEnabled ? 'ENABLED ✅' : 'PAUSED ⏸️'}`, 'color: #00b8a3; font-weight: bold;');
  }

  function isExtendoEnabled() {
    try {
      if (document.documentElement) {
        const attr = document.documentElement.getAttribute('data-extendo-enabled');
        if (attr !== null) {
          return attr === 'true';
        }
      }
    } catch (_) {}
    return isEnabled;
  }

  function isDarkThemeActive() {
    if (!isExtendoEnabled()) return false;
    return document.documentElement && document.documentElement.getAttribute('data-extendo-theme') === 'dark';
  }

  /* ==========================================================================
     Syntax Highlighting Tokens Tagging (Purely Local & Non-blocking)
     ========================================================================== */

  const controlKeywords = new Set([
    'import', 'from', 'for', 'in', 'return', 'if', 'elif', 'else',
    'while', 'with', 'as', 'try', 'except', 'finally', 'raise', 'yield',
    'pass', 'break', 'continue', 'assert', 'global', 'nonlocal'
  ]);
  const declKeywords = new Set(['def', 'class', 'lambda']);
  const builtins = new Set([
    'int', 'str', 'float', 'bool', 'list', 'dict', 'set', 'tuple',
    'map', 'len', 'range', 'print', 'min', 'max', 'sum', 'enumerate', 'zip'
  ]);

  // Fast, local tagging on a single rendered line element (no document scan)
  function tagTokensInLine(lineElt) {
    if (!lineElt || !lineElt.getElementsByClassName) return;

    // Tag keywords
    const kwSpans = lineElt.getElementsByClassName('cm-keyword');
    for (let i = 0; i < kwSpans.length; i++) {
      const span = kwSpans[i];
      const text = span.textContent.trim();
      if (declKeywords.has(text)) {
        span.classList.add('extendo-kw-blue');
        span.classList.remove('extendo-kw-purple');
      } else {
        span.classList.add('extendo-kw-purple');
        span.classList.remove('extendo-kw-blue');
      }
    }

    // Tag builtins
    const biSpans = lineElt.getElementsByClassName('cm-builtin');
    for (let i = 0; i < biSpans.length; i++) {
      biSpans[i].classList.add('extendo-builtin-cyan');
    }

    // In some modes, built-in functions may be tagged as cm-variable
    const varSpans = lineElt.getElementsByClassName('cm-variable');
    for (let i = 0; i < varSpans.length; i++) {
      const span = varSpans[i];
      if (builtins.has(span.textContent.trim())) {
        span.classList.add('extendo-builtin-cyan');
      }
    }
  }

  function tagAllLinesInEditor(cm) {
    if (!cm || typeof cm.getWrapperElement !== 'function') return;
    try {
      const wrapper = cm.getWrapperElement();
      const lines = wrapper.getElementsByClassName('CodeMirror-line');
      for (let i = 0; i < lines.length; i++) {
        tagTokensInLine(lines[i]);
      }
    } catch (_) {}
  }

  function applyDarkLayoutHelpers() {
    try {
      setupStdinResizer();
    } catch (_) {}

    if (!isDarkThemeActive()) {
      const liveBtns = document.querySelectorAll('.extendo-live-btn');
      for (let i = 0; i < liveBtns.length; i++) liveBtns[i].classList.remove('extendo-live-btn');
      const surfaces = document.querySelectorAll('.extendo-dark-surface');
      for (let i = 0; i < surfaces.length; i++) surfaces[i].classList.remove('extendo-dark-surface');
      return;
    }

    // 1. Tag CodeMirror ancestors with .extendo-dark-surface so all parent containers turn #262626
    const cm = document.querySelector('.CodeMirror');
    if (cm) {
      let curr = cm.parentElement;
      while (curr && curr !== document.body && curr !== document.documentElement) {
        curr.classList.add('extendo-dark-surface');
        curr = curr.parentElement;
      }
    }

    // 2. Tag Live / Connecting buttons so their red status color is clearly visible
    const buttons = document.querySelectorAll('button, div[role="button"]');
    for (let i = 0; i < buttons.length; i++) {
      const btn = buttons[i];
      const txt = (btn.textContent || '').trim();
      if (txt.includes('Connecting') || txt.includes('Live')) {
        btn.classList.add('extendo-live-btn');
      }
    }
  }

  // Handle messages from bridge script
  window.addEventListener('message', (event) => {
    if (event.data) {
      if (event.data.type === 'EXTENDO_SET_STATE') {
        updateEnabledState(event.data.enabled);
        applyDarkLayoutHelpers();
      } else if (event.data.type === 'EXTENDO_SET_THEME') {
        try {
          localStorage.setItem('extendo_theme', event.data.themeSetting);
          sessionStorage.setItem('extendo_theme', event.data.themeSetting);
          if (document.documentElement) {
            document.documentElement.setAttribute('data-extendo-theme', event.data.effectiveTheme);
          }
          console.log(`%c[Extendo] Theme updated: ${event.data.effectiveTheme.toUpperCase()} (mode: ${event.data.themeSetting}) 🎨`, 'color: #ffa116;');

          // If dark theme activated, tag visible lines in loaded CodeMirror instances
          if (event.data.effectiveTheme === 'dark') {
            const cms = document.querySelectorAll('.CodeMirror');
            for (const cmEl of cms) {
              if (cmEl.CodeMirror) {
                tagAllLinesInEditor(cmEl.CodeMirror);
              }
            }
          }
          applyDarkLayoutHelpers();
        } catch (_) {}
      } else if (event.data.type === 'EXTENDO_SET_STRIP_COLOR') {
        try {
          const color = event.data.stripColor || 'blue';
          localStorage.setItem('extendo_strip_color', color);
          sessionStorage.setItem('extendo_strip_color', color);
          if (document.documentElement) {
            document.documentElement.setAttribute('data-extendo-strip', color);
          }
          console.log(`%c[Extendo] Strip color updated: ${color.toUpperCase()} ✨`, 'color: #388bfd;');
        } catch (_) {}
      }
    }
  });

  // Listen to custom DOM event from bridge script
  window.addEventListener('extendo:state', (event) => {
    if (event.detail && event.detail.enabled !== undefined) {
      updateEnabledState(event.detail.enabled);
    }
  });

  // Watch for data-extendo-enabled attribute changes on <html>
  if (document.documentElement) {
    document.documentElement.setAttribute('data-extendo-loaded', 'true');
    try {
      const attrObserver = new MutationObserver((mutations) => {
        for (const m of mutations) {
          if (m.type === 'attributes' && m.attributeName === 'data-extendo-enabled') {
            const val = document.documentElement.getAttribute('data-extendo-enabled');
            if (val !== null) {
              const boolVal = val === 'true';
              if (boolVal !== isEnabled) {
                updateEnabledState(boolVal);
              }
            }
          }
        }
      });
      attrObserver.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['data-extendo-enabled']
      });
    } catch (_) {}
  }

  /* ==========================================================================
     CodeMirror 5 Line Operations (LeetCode Playground)
     ========================================================================== */

  function cmMoveLinesUp(cm) {
    if (!isExtendoEnabled()) return;

    cm.operation(() => {
      const from = cm.getCursor('from');
      const to = cm.getCursor('to');
      let startLine = from.line;
      let endLine = to.line;
      if (to.ch === 0 && endLine > startLine) {
        endLine--;
      }

      if (startLine <= 0) return;

      const targetLine = startLine - 1;
      const targetText = cm.getLine(targetLine);
      const selectedLines = [];
      for (let i = startLine; i <= endLine; i++) {
        selectedLines.push(cm.getLine(i));
      }

      const endLineLen = cm.getLine(endLine).length;
      const newText = [...selectedLines, targetText].join('\n');

      cm.replaceRange(
        newText,
        { line: targetLine, ch: 0 },
        { line: endLine, ch: endLineLen },
        '+extendo'
      );

      cm.setSelection(
        { line: from.line - 1, ch: from.ch },
        { line: to.line - 1, ch: to.ch }
      );
    });
  }

  function cmMoveLinesDown(cm) {
    if (!isExtendoEnabled()) return;

    cm.operation(() => {
      const from = cm.getCursor('from');
      const to = cm.getCursor('to');
      let startLine = from.line;
      let endLine = to.line;
      if (to.ch === 0 && endLine > startLine) {
        endLine--;
      }

      const totalLines = cm.lineCount();
      if (endLine >= totalLines - 1) return;

      const targetLine = endLine + 1;
      const targetText = cm.getLine(targetLine);
      const selectedLines = [];
      for (let i = startLine; i <= endLine; i++) {
        selectedLines.push(cm.getLine(i));
      }

      const targetLineLen = targetText.length;
      const newText = [targetText, ...selectedLines].join('\n');

      cm.replaceRange(
        newText,
        { line: startLine, ch: 0 },
        { line: targetLine, ch: targetLineLen },
        '+extendo'
      );

      cm.setSelection(
        { line: from.line + 1, ch: from.ch },
        { line: to.line + 1, ch: to.ch }
      );
    });
  }

  function cmCopyLinesDown(cm) {
    if (!isExtendoEnabled()) return;

    cm.operation(() => {
      const from = cm.getCursor('from');
      const to = cm.getCursor('to');
      let startLine = from.line;
      let endLine = to.line;
      if (to.ch === 0 && endLine > startLine) {
        endLine--;
      }

      const selectedLines = [];
      for (let i = startLine; i <= endLine; i++) {
        selectedLines.push(cm.getLine(i));
      }
      const duplicateText = selectedLines.join('\n');
      const lineSpan = endLine - startLine + 1;

      const endLineLen = cm.getLine(endLine).length;
      cm.replaceRange(
        '\n' + duplicateText,
        { line: endLine, ch: endLineLen },
        { line: endLine, ch: endLineLen },
        '+extendo'
      );

      cm.setSelection(
        { line: from.line + lineSpan, ch: from.ch },
        { line: to.line + lineSpan, ch: to.ch }
      );
    });
  }

  function cmCopyLinesUp(cm) {
    if (!isExtendoEnabled()) return;

    cm.operation(() => {
      const from = cm.getCursor('from');
      const to = cm.getCursor('to');
      let startLine = from.line;
      let endLine = to.line;
      if (to.ch === 0 && endLine > startLine) {
        endLine--;
      }

      const selectedLines = [];
      for (let i = startLine; i <= endLine; i++) {
        selectedLines.push(cm.getLine(i));
      }
      const duplicateText = selectedLines.join('\n');
      const lineSpan = endLine - startLine + 1;

      cm.replaceRange(
        duplicateText + '\n',
        { line: startLine, ch: 0 },
        { line: startLine, ch: 0 },
        '+extendo'
      );

      cm.setSelection(
        { line: from.line + lineSpan, ch: from.ch },
        { line: to.line + lineSpan, ch: to.ch }
      );
    });
  }

  /* ==========================================================================
     Monaco Editor Operations (LeetCode Problem Editor)
     ========================================================================== */

  function monacoExecuteAction(editor, actionType) {
    if (!isExtendoEnabled()) return;

    const actionMap = {
      'moveLinesDown': 'editor.action.moveLinesDownAction',
      'moveLinesUp': 'editor.action.moveLinesUpAction',
      'copyLinesDown': 'editor.action.copyLinesDownAction',
      'copyLinesUp': 'editor.action.copyLinesUpAction'
    };
    const actionId = actionMap[actionType];
    if (!actionId) return;

    try {
      if (typeof editor.getAction === 'function') {
        const action = editor.getAction(actionId);
        if (action && (typeof action.isSupported !== 'function' || action.isSupported())) {
          action.run();
          return;
        }
      }
    } catch (_) {}

    try {
      if (typeof editor.trigger === 'function') {
        editor.trigger('extendo', actionId, null);
      }
    } catch (_) {}
  }

  /* ==========================================================================
     Active Editor Detection
     ========================================================================== */

  function getActiveEditor(e) {
    const activeEl = document.activeElement;
    const target = e ? e.target : null;

    // 1. Check CodeMirror 5 (LeetCode Playground)
    if (target && target.closest) {
      const cmWrapper = target.closest('.CodeMirror');
      if (cmWrapper && cmWrapper.CodeMirror) {
        return { type: 'codemirror5', instance: cmWrapper.CodeMirror };
      }
    }

    if (activeEl && activeEl.closest) {
      const cmWrapper = activeEl.closest('.CodeMirror');
      if (cmWrapper && cmWrapper.CodeMirror) {
        return { type: 'codemirror5', instance: cmWrapper.CodeMirror };
      }
    }

    const cmElements = document.querySelectorAll('.CodeMirror');
    for (const el of cmElements) {
      if (el.CodeMirror) {
        if (typeof el.CodeMirror.hasFocus === 'function' && el.CodeMirror.hasFocus()) {
          return { type: 'codemirror5', instance: cmWrapper ? cmWrapper.CodeMirror : el.CodeMirror };
        }
        if (el.classList.contains('CodeMirror-focused')) {
          return { type: 'codemirror5', instance: el.CodeMirror };
        }
      }
    }

    // If there is 1 CodeMirror on page (Playground)
    if (cmElements.length === 1 && cmElements[0].CodeMirror) {
      return { type: 'codemirror5', instance: cmElements[0].CodeMirror };
    }

    // 2. Check Monaco Editor
    if (window.monaco && window.monaco.editor && typeof window.monaco.editor.getEditors === 'function') {
      const editors = window.monaco.editor.getEditors();
      for (const ed of editors) {
        if ((typeof ed.hasTextFocus === 'function' && ed.hasTextFocus()) ||
            (typeof ed.hasWidgetFocus === 'function' && ed.hasWidgetFocus())) {
          return { type: 'monaco', instance: ed };
        }
      }
      if (activeEl && activeEl.closest && activeEl.closest('.monaco-editor')) {
        for (const ed of editors) {
          const dom = ed.getDomNode ? ed.getDomNode() : null;
          if (dom && dom.contains(activeEl)) {
            return { type: 'monaco', instance: ed };
          }
        }
      }
      if (editors.length === 1) {
        return { type: 'monaco', instance: editors[0] };
      }
    }

    // 3. Check CodeMirror 6
    const cm6 = document.querySelector('.cm-editor');
    if (cm6) {
      const content = cm6.querySelector('.cm-content');
      if (content && content.cmView && content.cmView.view) {
        return { type: 'codemirror6', instance: content.cmView.view };
      }
    }

    // 4. Check Ace Editor
    const aceEl = (target && target.closest ? target.closest('.ace_editor') : null) ||
                  (activeEl && activeEl.closest ? activeEl.closest('.ace_editor') : null);
    if (aceEl && aceEl.env && aceEl.env.editor) {
      return { type: 'ace', instance: aceEl.env.editor };
    }

    return null;
  }

  function isEditorFocusOrTarget(e) {
    const target = e.target;
    const activeEl = document.activeElement;

    const isInsideEditor = (el) => {
      if (!el || !el.closest) return false;
      return !!(
        el.closest('.CodeMirror') ||
        el.closest('.monaco-editor') ||
        el.closest('.cm-editor') ||
        el.closest('.ace_editor') ||
        (el.tagName === 'TEXTAREA' && el.classList.contains('inputarea'))
      );
    };

    if (isInsideEditor(target) || isInsideEditor(activeEl)) {
      return true;
    }

    // Disallow if inside regular non-code input elements
    if (target && (target.tagName === 'INPUT' || (target.tagName === 'TEXTAREA' && !isInsideEditor(target)))) {
      return false;
    }

    // Fallback: If CodeMirror exists on page
    if (document.querySelector('.CodeMirror')) {
      return true;
    }

    return false;
  }

  /* ==========================================================================
     Keydown Event Interceptor (Capture Phase)
     ========================================================================== */

  function handleKeyDown(e) {
    // If extension is toggled OFF, NEVER intercept! Let browser & editor handle natively!
    if (!isExtendoEnabled()) {
      return;
    }

    const isDownArrow = e.key === 'ArrowDown' || e.code === 'ArrowDown' || e.keyCode === 40;
    const isUpArrow = e.key === 'ArrowUp' || e.code === 'ArrowUp' || e.keyCode === 38;

    if (!isDownArrow && !isUpArrow) return;
    if (!isEditorFocusOrTarget(e)) return;

    let action = null;

    // 1. Move Line Down / Up:
    // Option + Down / Up (macOS) or Alt + Down / Up (Windows/Linux)
    if (e.altKey && !e.metaKey && !e.ctrlKey && !e.shiftKey) {
      if (isDownArrow) action = 'moveLinesDown';
      else if (isUpArrow) action = 'moveLinesUp';
    }

    // 2. Duplicate Line Down / Up:
    // macOS: Cmd + Option + Down/Up OR Shift + Option + Down/Up
    // Windows/Linux: Shift + Alt + Down/Up OR Ctrl + Alt + Down/Up
    if (!action) {
      const isMacCmdOption = isMac && e.metaKey && e.altKey && !e.ctrlKey;
      const isShiftAlt = e.shiftKey && e.altKey && !e.ctrlKey && (!isMac || !e.metaKey);
      const isWinCtrlAlt = !isMac && e.ctrlKey && e.altKey && !e.shiftKey;

      if (isMacCmdOption || isShiftAlt || isWinCtrlAlt) {
        if (isDownArrow) action = 'copyLinesDown';
        else if (isUpArrow) action = 'copyLinesUp';
      }
    }

    if (!action) return;

    // Prevent default browser behavior (e.g. macOS paragraph jump or page scroll)
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    const editorInfo = getActiveEditor(e);
    if (!editorInfo) {
      return;
    }

    console.debug(`[Extendo] Executing ${action} on ${editorInfo.type}`);

    if (editorInfo.type === 'codemirror5') {
      const cm = editorInfo.instance;
      if (action === 'moveLinesDown') cmMoveLinesDown(cm);
      else if (action === 'moveLinesUp') cmMoveLinesUp(cm);
      else if (action === 'copyLinesDown') cmCopyLinesDown(cm);
      else if (action === 'copyLinesUp') cmCopyLinesUp(cm);
    } else if (editorInfo.type === 'monaco') {
      monacoExecuteAction(editorInfo.instance, action);
    }
  }

  // Attach keydown listener in capture phase
  window.addEventListener('keydown', handleKeyDown, true);

  /* ==========================================================================
     CodeMirror Direct ExtraKeys & Line Render Hooking
     ========================================================================== */

  function hookCodeMirrorInstance(cm) {
    if (!cm || cm.__extendo_hooked__) return;
    cm.__extendo_hooked__ = true;

    const getPass = () => {
      if (window.CodeMirror && window.CodeMirror.Pass) return window.CodeMirror.Pass;
      return undefined;
    };

    const customKeys = {
      'Alt-Up': (inst) => {
        if (!isExtendoEnabled()) return getPass();
        cmMoveLinesUp(inst);
      },
      'Alt-Down': (inst) => {
        if (!isExtendoEnabled()) return getPass();
        cmMoveLinesDown(inst);
      },
      'Cmd-Alt-Down': (inst) => {
        if (!isExtendoEnabled()) return getPass();
        cmCopyLinesDown(inst);
      },
      'Cmd-Alt-Up': (inst) => {
        if (!isExtendoEnabled()) return getPass();
        cmCopyLinesUp(inst);
      },
      'Shift-Alt-Down': (inst) => {
        if (!isExtendoEnabled()) return getPass();
        cmCopyLinesDown(inst);
      },
      'Shift-Alt-Up': (inst) => {
        if (!isExtendoEnabled()) return getPass();
        cmCopyLinesUp(inst);
      },
      'Ctrl-Alt-Down': (inst) => {
        if (!isExtendoEnabled()) return getPass();
        cmCopyLinesDown(inst);
      },
      'Ctrl-Alt-Up': (inst) => {
        if (!isExtendoEnabled()) return getPass();
        cmCopyLinesUp(inst);
      }
    };

    try {
      const extra = cm.getOption('extraKeys') || {};
      cm.setOption('extraKeys', Object.assign({}, extra, customKeys));
      console.log('%c[Extendo] Hooked CodeMirror extraKeys with toggle-aware handlers! 🎯', 'color: #00b8a3;');
    } catch (err) {
      console.debug('[Extendo] CodeMirror hook notice:', err);
    }

    // Hook renderLine to tag keywords (import/from purple, def blue, print cyan)
    try {
      cm.on('renderLine', (instance, line, elt) => {
        if (isDarkThemeActive()) {
          tagTokensInLine(elt);
        }
      });
      // Initial tag of visible lines
      if (isDarkThemeActive()) {
        tagAllLinesInEditor(cm);
      }
    } catch (_) {}
  }

  /* ==========================================================================
     LeetCode-Style Stdin Drawer Resizer & Drag Mechanics
     ========================================================================== */

  const STDIN_DEFAULT_HEIGHT = 180;
  const STDIN_MIN_HEIGHT = 48;
  let stdinResizerBound = false;

  function getSavedStdinHeight() {
    try {
      const stored = localStorage.getItem('extendo_stdin_height') || sessionStorage.getItem('extendo_stdin_height');
      if (stored) {
        const val = parseInt(stored, 10);
        if (!isNaN(val) && val >= STDIN_MIN_HEIGHT) {
          return val;
        }
      }
    } catch (_) {}
    return STDIN_DEFAULT_HEIGHT;
  }

  function saveStdinHeight(h) {
    try {
      localStorage.setItem('extendo_stdin_height', String(h));
      sessionStorage.setItem('extendo_stdin_height', String(h));
    } catch (_) {}
  }

  function updateStdinVisibility(pane2, stdinPane, resizer) {
    if (!pane2 || !stdinPane || !resizer) return;
    if (!isExtendoEnabled()) {
      resizer.style.display = 'none';
      return;
    }

    const textarea = pane2.querySelector('textarea');
    const checkbox = pane2.querySelector('input[type="checkbox"]');
    const isChecked = checkbox ? checkbox.checked : true;
    const isVisible = textarea ? (textarea.offsetParent !== null || textarea.clientHeight > 0) : false;

    const isOpen = (checkbox ? isChecked : isVisible);

    if (isOpen) {
      resizer.style.display = 'flex';
      stdinPane.classList.remove('extendo-stdin-collapsed');
    } else {
      resizer.style.display = 'none';
      stdinPane.classList.add('extendo-stdin-collapsed');
    }
  }

  function setupDragListeners(resizer, pane2, stdinPane) {
    let isDragging = false;
    let startY = 0;
    let startHeight = 0;

    function onMouseDown(e) {
      if (e.button !== 0) return; // Left click only
      if (!isExtendoEnabled()) return;

      isDragging = true;
      startY = e.clientY;

      const computedH = parseFloat(getComputedStyle(stdinPane).height) || stdinPane.offsetHeight || getSavedStdinHeight();
      startHeight = computedH;

      resizer.classList.add('extendo-dragging');
      document.body.classList.add('extendo-resizing-stdin');

      window.addEventListener('mousemove', onMouseMove, { capture: true, passive: false });
      window.addEventListener('mouseup', onMouseUp, { capture: true, passive: false });

      e.preventDefault();
      e.stopPropagation();
    }

    function onMouseMove(e) {
      if (!isDragging) return;
      e.preventDefault();
      e.stopPropagation();

      const dy = startY - e.clientY; // Upward drag expands stdin height
      const paneRect = pane2.getBoundingClientRect();
      const maxAllowedHeight = Math.max(STDIN_MIN_HEIGHT, Math.round(paneRect.height - 80));
      const newHeight = Math.min(maxAllowedHeight, Math.max(STDIN_MIN_HEIGHT, Math.round(startHeight + dy)));

      pane2.style.setProperty('--extendo-stdin-height', `${newHeight}px`);
    }

    function onMouseUp(e) {
      if (!isDragging) return;
      isDragging = false;

      resizer.classList.remove('extendo-dragging');
      document.body.classList.remove('extendo-resizing-stdin');

      window.removeEventListener('mousemove', onMouseMove, { capture: true });
      window.removeEventListener('mouseup', onMouseUp, { capture: true });

      const finalHeight = parseInt(pane2.style.getPropertyValue('--extendo-stdin-height'), 10) || STDIN_DEFAULT_HEIGHT;
      saveStdinHeight(finalHeight);

      e.preventDefault();
      e.stopPropagation();
    }

    resizer.addEventListener('mousedown', onMouseDown);

    // Double-click resets to default height
    resizer.addEventListener('dblclick', (e) => {
      e.preventDefault();
      pane2.style.setProperty('--extendo-stdin-height', `${STDIN_DEFAULT_HEIGHT}px`);
      saveStdinHeight(STDIN_DEFAULT_HEIGHT);
    });
  }

  function setupStdinResizer() {
    if (!isExtendoEnabled()) {
      const existing = document.querySelector('.extendo-stdin-resizer');
      if (existing) existing.style.display = 'none';
      return;
    }

    const pane2 = document.querySelector('.Pane2, [class*="Pane2"]');
    if (!pane2) return;

    // Find textarea or stdin container in pane2
    const textarea = pane2.querySelector('textarea');

    let stdinPane = null;
    if (textarea) {
      let curr = textarea;
      while (curr.parentElement && curr.parentElement !== pane2) {
        if (curr.parentElement.querySelector('[class*="output"], [class*="console"], [class*="Output"], pre')) {
          break;
        }
        curr = curr.parentElement;
      }
      stdinPane = curr;
    }

    if (!stdinPane) {
      const candidates = pane2.querySelectorAll('[class*="stdin-wrapper"], [class*="stdin-container"], [class*="stdin"]');
      for (let i = 0; i < candidates.length; i++) {
        const cand = candidates[i];
        let curr = cand;
        while (curr.parentElement && curr.parentElement !== pane2) {
          curr = curr.parentElement;
        }
        if (curr.parentElement === pane2) {
          stdinPane = curr;
          break;
        }
      }
    }

    if (!stdinPane) {
      for (let i = 0; i < pane2.children.length; i++) {
        const child = pane2.children[i];
        const txt = (child.textContent || '').trim().toLowerCase();
        if (txt.startsWith('stdin') || child.querySelector('textarea')) {
          stdinPane = child;
          break;
        }
      }
    }

    if (!stdinPane) return;

    while (stdinPane.parentElement && stdinPane.parentElement !== pane2) {
      stdinPane = stdinPane.parentElement;
    }

    if (stdinPane.parentElement !== pane2) return;

    // Tag output sibling children before stdinPane
    for (let i = 0; i < pane2.children.length; i++) {
      const child = pane2.children[i];
      if (child === stdinPane || child.classList.contains('extendo-stdin-resizer')) {
        break;
      }
      child.classList.add('extendo-output-pane');
    }

    // Tag stdinPane
    stdinPane.classList.add('extendo-stdin-pane');

    // Get or create resizer
    let resizer = pane2.querySelector('.extendo-stdin-resizer');
    if (!resizer) {
      resizer = document.createElement('div');
      resizer.className = 'extendo-stdin-resizer';
      resizer.setAttribute('role', 'separator');
      resizer.setAttribute('aria-orientation', 'horizontal');
      resizer.setAttribute('title', 'Drag to resize stdin (Double-click to reset)');

      const line = document.createElement('div');
      line.className = 'extendo-stdin-line';
      resizer.appendChild(line);

      const notch = document.createElement('div');
      notch.className = 'extendo-stdin-notch';
      resizer.appendChild(notch);

      setupDragListeners(resizer, pane2, stdinPane);
    }

    // Ensure resizer is placed immediately before stdinPane
    if (resizer.nextElementSibling !== stdinPane) {
      pane2.insertBefore(resizer, stdinPane);
    }

    // Apply saved height CSS variable to pane2
    const currentVar = pane2.style.getPropertyValue('--extendo-stdin-height');
    if (!currentVar) {
      const savedH = getSavedStdinHeight();
      pane2.style.setProperty('--extendo-stdin-height', `${savedH}px`);
    }

    // Check visibility / collapsed state
    updateStdinVisibility(pane2, stdinPane, resizer);

    // Bind pane2 events once
    if (!stdinResizerBound) {
      stdinResizerBound = true;
      pane2.addEventListener('click', () => {
        setTimeout(() => updateStdinVisibility(pane2, stdinPane, resizer), 50);
      });
      pane2.addEventListener('change', () => {
        setTimeout(() => updateStdinVisibility(pane2, stdinPane, resizer), 50);
      });
    }
  }

  // Handle window resizing to keep heights within pane2 bounds
  window.addEventListener('resize', () => {
    const pane2 = document.querySelector('.Pane2, [class*="Pane2"]');
    if (!pane2) return;
    const currentH = parseInt(pane2.style.getPropertyValue('--extendo-stdin-height'), 10);
    if (currentH) {
      const maxAllowed = Math.max(STDIN_MIN_HEIGHT, Math.round(pane2.clientHeight - 80));
      if (currentH > maxAllowed && maxAllowed > STDIN_MIN_HEIGHT) {
        pane2.style.setProperty('--extendo-stdin-height', `${maxAllowed}px`);
      }
    }
  }, { passive: true });

  function scanAndHookCodeMirror() {
    const cmElements = document.querySelectorAll('.CodeMirror');
    for (const el of cmElements) {
      if (el.CodeMirror) {
        hookCodeMirrorInstance(el.CodeMirror);
      }
    }
    applyDarkLayoutHelpers();
    try {
      setupStdinResizer();
    } catch (_) {}
  }

  // Non-intrusive MutationObserver: ONLY checks addedNodes for .CodeMirror, .Pane2, or stdin
  const nodeObserver = new MutationObserver((mutations) => {
    let shouldCheckStdin = false;
    for (const m of mutations) {
      for (const node of m.addedNodes) {
        if (node.nodeType === 1) { // ELEMENT_NODE
          if (node.classList && node.classList.contains('CodeMirror') && node.CodeMirror) {
            hookCodeMirrorInstance(node.CodeMirror);
          } else if (node.getElementsByClassName) {
            const cms = node.getElementsByClassName('CodeMirror');
            for (let i = 0; i < cms.length; i++) {
              if (cms[i].CodeMirror) {
                hookCodeMirrorInstance(cms[i].CodeMirror);
              }
            }
          }

          if (node.matches && (node.matches('.Pane2, [class*="Pane2"], textarea, [class*="stdin"]') || (node.querySelector && node.querySelector('.Pane2, textarea, [class*="stdin"]')))) {
            shouldCheckStdin = true;
          }
        }
      }
    }
    if (shouldCheckStdin) {
      try {
        setupStdinResizer();
      } catch (_) {}
    }
  });

  if (document.body) {
    nodeObserver.observe(document.body, { childList: true, subtree: true });
    scanAndHookCodeMirror();
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      nodeObserver.observe(document.body, { childList: true, subtree: true });
      scanAndHookCodeMirror();
    }, { once: true });
  }

  // Safe initial hook attempts, then stops
  setTimeout(scanAndHookCodeMirror, 300);
  setTimeout(scanAndHookCodeMirror, 1000);
  setTimeout(scanAndHookCodeMirror, 2500);

})();

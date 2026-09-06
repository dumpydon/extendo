/**
 * Extendo Bridge Script (Isolated World) - v1.4.2
 * - Synchronizes toggle state and appearance theme between chrome.storage and the page.
 * - Enforces: When extension is toggled OFF, theme reverts to LIGHT immediately!
 * - Sets instantaneous DOM attributes:
 *     'data-extendo-enabled' ("true" | "false")
 *     'data-extendo-theme' ("dark" | "light")
 */

(function () {
  'use strict';

  // Strictly restrict execution to LeetCode Playground pages only!
  const isPlayground = window.location.pathname.startsWith('/playground') || 
                       window.location.href.includes('/playground');
  if (!isPlayground) {
    return;
  }

  let isExtensionEnabled = true;
  let currentThemeSetting = 'system';
  let currentStripColor = 'blue';

  function computeEffectiveTheme(setting, enabled) {
    // If master extension toggle is OFF, always revert to light mode (original LeetCode)!
    if (enabled === false) {
      return 'light';
    }
    if (setting === 'dark') return 'dark';
    if (setting === 'light') return 'light';
    // 'system'
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    return prefersDark ? 'dark' : 'light';
  }

  function applyTheme(setting) {
    currentThemeSetting = setting || currentThemeSetting || 'system';
    const effective = computeEffectiveTheme(currentThemeSetting, isExtensionEnabled);

    try {
      if (document.documentElement) {
        document.documentElement.setAttribute('data-extendo-theme', effective);
      }
    } catch (_) {}

    try {
      window.postMessage({
        type: 'EXTENDO_SET_THEME',
        themeSetting: currentThemeSetting,
        effectiveTheme: effective,
        enabled: isExtensionEnabled
      }, '*');
    } catch (_) {}
  }

  function applyStripColor(color) {
    currentStripColor = color || currentStripColor || 'blue';
    try {
      if (document.documentElement) {
        document.documentElement.setAttribute('data-extendo-strip', currentStripColor);
      }
    } catch (_) {}

    try {
      window.postMessage({
        type: 'EXTENDO_SET_STRIP_COLOR',
        stripColor: currentStripColor
      }, '*');
    } catch (_) {}
  }

  function applyToggleState(enabled) {
    isExtensionEnabled = enabled !== false;
    const strVal = isExtensionEnabled ? 'true' : 'false';

    try {
      if (document.documentElement) {
        document.documentElement.setAttribute('data-extendo-enabled', strVal);
      }
    } catch (_) {}

    // When toggle state changes, also re-apply theme so disabling
    // immediately reverts to light mode, and enabling restores user's theme!
    applyTheme(currentThemeSetting);

    try {
      window.postMessage({
        type: 'EXTENDO_SET_STATE',
        enabled: isExtensionEnabled
      }, '*');
    } catch (_) {}

    try {
      window.dispatchEvent(new CustomEvent('extendo:state', {
        detail: { enabled: isExtensionEnabled }
      }));
    } catch (_) {}
  }

  // Initial read from chrome.storage.local
  function readInitialState() {
    try {
      if (chrome.storage && chrome.storage.local) {
        chrome.storage.local.get(['extendo_enabled', 'extendo_theme', 'extendo_strip_color'], (result) => {
          isExtensionEnabled = result.extendo_enabled !== false; // default true
          currentThemeSetting = result.extendo_theme || 'system';
          currentStripColor = result.extendo_strip_color || 'blue';

          applyToggleState(isExtensionEnabled);
          applyStripColor(currentStripColor);
        });
      }
    } catch (e) {
      console.debug('[Extendo Bridge] Storage read notice:', e);
    }
  }

  // Listen for storage changes in real time (from popup)
  try {
    if (chrome.storage && chrome.storage.onChanged) {
      chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === 'local') {
          if (changes.extendo_enabled !== undefined) {
            applyToggleState(changes.extendo_enabled.newValue);
          }
          if (changes.extendo_theme !== undefined) {
            applyTheme(changes.extendo_theme.newValue);
          }
          if (changes.extendo_strip_color !== undefined) {
            applyStripColor(changes.extendo_strip_color.newValue);
          }
        }
      });
    }
  } catch (e) {}

  // Listen for runtime tab messages from popup
  try {
    if (chrome.runtime && chrome.runtime.onMessage) {
      chrome.runtime.onMessage.addListener((message) => {
        if (message) {
          if (message.type === 'EXTENDO_SET_STATE') {
            applyToggleState(message.enabled);
          } else if (message.type === 'EXTENDO_SET_THEME') {
            applyTheme(message.theme);
          } else if (message.type === 'EXTENDO_SET_STRIP_COLOR') {
            applyStripColor(message.stripColor);
          }
        }
      });
    }
  } catch (e) {}

  // OS theme change listener (for 'system' preference)
  try {
    if (window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleSystemThemeChange = () => {
        if (currentThemeSetting === 'system') {
          applyTheme('system');
        }
      };
      if (typeof mediaQuery.addEventListener === 'function') {
        mediaQuery.addEventListener('change', handleSystemThemeChange);
      } else if (typeof mediaQuery.addListener === 'function') {
        mediaQuery.addListener(handleSystemThemeChange);
      }
    }
  } catch (_) {}

  // Injection fallback: ensure extendo.js is running in MAIN world
  function ensureMainScriptInjected() {
    try {
      if (document.documentElement && document.documentElement.getAttribute('data-extendo-loaded') === 'true') {
        return;
      }

      const scriptUrl = chrome.runtime.getURL('content/extendo.js');
      if (document.querySelector(`script[src="${scriptUrl}"]`)) {
        return;
      }

      const script = document.createElement('script');
      script.src = scriptUrl;
      script.type = 'text/javascript';
      script.async = false;
      (document.head || document.documentElement).appendChild(script);
      script.onload = () => script.remove();
    } catch (e) {
      console.debug('[Extendo Bridge] Injection fallback notice:', e);
    }
  }

  // Execute immediately
  readInitialState();
  ensureMainScriptInjected();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      readInitialState();
      ensureMainScriptInjected();
    }, { once: true });
  }
})();

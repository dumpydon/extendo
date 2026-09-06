document.addEventListener('DOMContentLoaded', async () => {
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0 ||
                navigator.userAgent.toUpperCase().indexOf('MAC') >= 0;

  const platformLabel = document.getElementById('platformLabel');
  if (platformLabel) {
    platformLabel.textContent = isMac ? 'macOS' : 'Windows / Linux';
  }

  const toggle = document.getElementById('extendoToggle');
  const toggleSubtitle = document.getElementById('toggleSubtitle');
  const statusBadge = document.getElementById('statusBadge');
  const statusDot = document.querySelector('.status-dot');
  const statusText = document.getElementById('statusText');
  const bannerText = document.getElementById('bannerText');

  // Theme Elements
  const themeActiveLabel = document.getElementById('themeActiveLabel');
  const themeButtons = document.querySelectorAll('.theme-option');

  // Strip Color Elements
  const stripActiveLabel = document.getElementById('stripActiveLabel');
  const stripChips = document.querySelectorAll('.strip-chip');

  let isCurrentTabPlayground = false;

  // Detect current active tab URL
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const currentTab = tabs[0];
    if (currentTab && currentTab.url) {
      const url = currentTab.url;
      if (url.includes('leetcode.com/playground') || url.includes('leetcode.cn/playground')) {
        isCurrentTabPlayground = true;
      }
    }
  } catch (err) {
    console.debug('[Extendo Popup] Tab query notice:', err);
  }

  function updateStatusUI(enabled) {
    if (!enabled) {
      statusText.textContent = 'Disabled';
      statusText.style.color = '#8a8a8a';
      statusDot.style.backgroundColor = '#8a8a8a';
      statusDot.style.boxShadow = 'none';
      statusBadge.style.backgroundColor = 'rgba(138, 138, 138, 0.15)';
      statusBadge.style.borderColor = 'rgba(138, 138, 138, 0.3)';
      toggleSubtitle.textContent = 'Shortcuts are paused';
      toggleSubtitle.style.color = '#8a8a8a';
      bannerText.textContent = 'Extension turned off via switch';
      return;
    }

    // Enabled state
    statusText.style.color = '#00b8a3';
    statusDot.style.backgroundColor = '#00b8a3';
    statusDot.style.boxShadow = '0 0 6px #00b8a3';
    statusBadge.style.backgroundColor = 'rgba(0, 184, 163, 0.12)';
    statusBadge.style.borderColor = 'rgba(0, 184, 163, 0.3)';
    toggleSubtitle.textContent = 'Active on Playground';
    toggleSubtitle.style.color = '#00b8a3';

    if (isCurrentTabPlayground) {
      statusText.textContent = 'Active on Playground';
      bannerText.textContent = 'LeetCode Playground active & shortcuts ready';
    } else {
      statusText.textContent = 'Standby';
      statusDot.style.backgroundColor = '#8a8a8a';
      statusDot.style.boxShadow = 'none';
      bannerText.textContent = 'Open LeetCode Playground to use';
    }
  }

  function updateThemeUI(theme) {
    const themeNameMap = {
      'system': 'System Default',
      'light': 'Light',
      'dark': 'Dark'
    };
    if (themeActiveLabel) {
      themeActiveLabel.textContent = themeNameMap[theme] || 'System Default';
    }

    themeButtons.forEach((btn) => {
      if (btn.getAttribute('data-theme') === theme) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  function updateStripColorUI(color) {
    if (stripActiveLabel) {
      stripActiveLabel.textContent = color.charAt(0).toUpperCase() + color.slice(1);
    }

    stripChips.forEach((chip) => {
      if (chip.getAttribute('data-strip') === color) {
        chip.classList.add('active');
      } else {
        chip.classList.remove('active');
      }
    });
  }

  // Load saved state from chrome.storage.local
  if (chrome.storage && chrome.storage.local) {
    chrome.storage.local.get(['extendo_enabled', 'extendo_theme', 'extendo_strip_color'], (result) => {
      const enabled = result.extendo_enabled !== false; // Default true
      toggle.checked = enabled;
      updateStatusUI(enabled);

      const theme = result.extendo_theme || 'system';
      updateThemeUI(theme);

      const stripColor = result.extendo_strip_color || 'blue';
      updateStripColorUI(stripColor);
    });
  } else {
    toggle.checked = true;
    updateStatusUI(true);
    updateThemeUI('system');
    updateStripColorUI('blue');
  }

  // Handle toggle switch change
  toggle.addEventListener('change', () => {
    const enabled = toggle.checked;
    updateStatusUI(enabled);

    if (chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ extendo_enabled: enabled });
    }

    broadcastMessage({
      type: 'EXTENDO_SET_STATE',
      enabled: enabled
    });
  });

  // Handle theme buttons click
  themeButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const selectedTheme = btn.getAttribute('data-theme');
      updateThemeUI(selectedTheme);

      if (chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ extendo_theme: selectedTheme });
      }

      broadcastMessage({
        type: 'EXTENDO_SET_THEME',
        theme: selectedTheme
      });
    });
  });

  // Handle strip color click
  stripChips.forEach((chip) => {
    chip.addEventListener('click', () => {
      const selectedColor = chip.getAttribute('data-strip');
      updateStripColorUI(selectedColor);

      if (chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ extendo_strip_color: selectedColor });
      }

      broadcastMessage({
        type: 'EXTENDO_SET_STRIP_COLOR',
        stripColor: selectedColor
      });
    });
  });

  function broadcastMessage(payload) {
    try {
      chrome.tabs.query({
        url: [
          '*://leetcode.com/playground*',
          '*://*.leetcode.com/playground*',
          '*://leetcode.cn/playground*',
          '*://*.leetcode.cn/playground*'
        ]
      }, (tabs) => {
        if (tabs && tabs.length > 0) {
          for (const tab of tabs) {
            chrome.tabs.sendMessage(tab.id, payload).catch(() => {});
          }
        }
      });
    } catch (_) {}
  }
});

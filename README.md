<div align="center">
  <img src="icons/icon128.png" width="80" height="80" alt="Extendo Logo" />
  <h1>Extendo</h1>
  <p><b>Supercharge your LeetCode Playground experience.</b></p>
  <p>VS Code line shortcuts, authentic LeetCode dark mode, custom line highlights, a draggable STDIN slider, and a bounded code/output column divider.</p>
</div>

---

## ✨ Features

- ⚡ **VS Code Keyboard Shortcuts**: Move and duplicate lines up or down effortlessly.
- 🌙 **Authentic Dark Mode**: Official LeetCode dark gray (`#262626`), crisp white cursor, and exact Python syntax highlighting.
- 🎨 **Line Highlight Colors**: 8 customizable active line highlight tints (Blue, Yellow, Green, Red, Magenta, Pink, Orange, White).
- ↕️ **Resizable STDIN**: Drag up/down to give test input more room. Your preferred height is remembered.
- ↔️ **Resizable Columns**: Drag the full-height code/output divider between **40% and 83.33%** of the page width.
- 🎛️ **Independent Slider Toggles**: Enable or disable **Resize STDIN** and **Resize columns** separately in the popup.
- 🔒 **Playground Only**: Runs on LeetCode Playground pages (`leetcode.com` and `leetcode.cn`, including subdomains).

---

## 🎚️ How to Use

- **STDIN:** Click **stdin** to expand it, then drag the handle above it up/down.
- **Columns:** Drag the divider between code and output left/right. STDIN stays on the right.
- **Keyboard:** Press <kbd>Tab</kbd> to focus a handle, then use the arrow keys. Hold <kbd>Shift</kbd> for bigger steps; <kbd>Home</kbd>/<kbd>End</kbd> jump to the limits.
- **Reset & settings:** Double-click a handle to reset. Click Extendo in Chrome’s extensions menu to toggle either slider. Sizes save automatically.

---

## ⌨️ Keyboard Shortcuts

| Action | macOS | Windows / Linux |
| :--- | :--- | :--- |
| **Duplicate Line Down** | <kbd>⌥</kbd> + <kbd>⇧</kbd> + <kbd>↓</kbd> | <kbd>Shift</kbd> + <kbd>Alt</kbd> + <kbd>↓</kbd> |
| **Duplicate Line Up** | <kbd>⌥</kbd> + <kbd>⇧</kbd> + <kbd>↑</kbd> | <kbd>Shift</kbd> + <kbd>Alt</kbd> + <kbd>↑</kbd> |
| **Move Line Down** | <kbd>⌥</kbd> + <kbd>↓</kbd> | <kbd>Alt</kbd> + <kbd>↓</kbd> |
| **Move Line Up** | <kbd>⌥</kbd> + <kbd>↑</kbd> | <kbd>Alt</kbd> + <kbd>↑</kbd> |

---

## 🚀 How to Install

### 1. Get Extendo — choose A or B

**📦 Option A: Download ZIP (recommended for most people)**

[Download Extendo](https://github.com/dumpydon/extendo/raw/main/extendo.zip), then unzip it: double-click the ZIP on Mac, or right-click → **Extract All** on Windows. Keep the extracted folder somewhere permanent, such as Documents.

**⚡ Option B: Use Git**

Run this in your terminal:

```sh
git clone https://github.com/dumpydon/extendo.git
```

### 2. Add it to Chrome — same steps for both options

1. Open **Google Chrome**, paste `chrome://extensions` into the address bar, and press **Enter**.
2. Turn on **Developer mode** in the top-right corner.
3. Click **Load unpacked** in the top-left corner.
4. Select the extracted or cloned **folder containing `manifest.json`** — not the ZIP file.

### 3. Start using it

Open [LeetCode Playground](https://leetcode.com/playground/), or refresh it if already open. Done! Click Chrome’s puzzle-piece **Extensions** button, then **Extendo**, to find its settings.

---

## 🔄 Updating an Existing Installation

1. **Get the latest files:** ZIP users can [download the updated ZIP](https://github.com/dumpydon/extendo/raw/main/extendo.zip) and extract it into their existing extension folder. Git users can run `git pull` inside their checkout.
2. Open `chrome://extensions`, find **Extendo**, and click **Reload**.
3. Refresh your open playground tabs. The popup should show **v1.6.1**, **Resize STDIN**, and **Resize columns**.

> 💡 Refreshing the website alone does **not** reload the extension’s updated manifest or content scripts. If you extracted to a new folder, use **Load unpacked** to select that folder instead.

---

## 📄 License

MIT License. Free and open source.


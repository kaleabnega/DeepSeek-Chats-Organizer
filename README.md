# DeepSeek Chats Organizer

DeepSeek Chats Organizer is a Chrome extension that adds a **Projects** panel inside `chat.deepseek.com` so you can group chats into projects, keep your work organized, and jump to conversations quickly. It runs entirely in the browser and stores your data in Chrome Sync.

> Note: This extension is not affiliated with or endorsed by DeepSeek.

## Features

- Create, rename, and delete projects
- Assign/unassign chats to projects
- Quick links to open chats from the Projects panel
- Optional “Launch” gating via the popup (panel appears only after user activation)
- Syncs data across devices via `chrome.storage.sync`

## How It Works

- A content script injects a Projects panel into DeepSeek’s sidebar.
- Projects and chat assignments are stored in `chrome.storage.sync`.
- A popup provides an explicit **Launch** action before enabling the in‑page panel.

## Installation (Local Development)

1. Clone the repository to your machine.
2. Open Chrome and navigate to `chrome://extensions`.
3. Enable **Developer mode** (top right).
4. Click **Load unpacked** and select the cloned `DeepSeek-Chats-Organizer` folder.
5. Visit `https://chat.deepseek.com/` and click the extension icon → **Launch**.

## Usage

1. Click the extension icon and press **Launch**.
2. The Projects panel appears beneath DeepSeek’s “New Chat” button.
3. Create a project and assign chats using **Assign**.
4. Click a chat title in the Projects list to open it.

## Data Storage & Privacy

- **Storage location:** `chrome.storage.sync`
- **Data collected:** Project names and chat‑to‑project mappings only
- **External servers:** None

## Folder Structure

```
DeepSeek-Chats-Organizer/
  manifest.json
  content.js
  styles.css
  background.js
  popup.html
  popup.js
  popup.css
  icons/
```

## Troubleshooting

- If the panel doesn’t appear, open the popup and click **Launch** again.
- If chat navigation doesn’t work, reload the tab after updating the extension.



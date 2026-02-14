# Privacy Policy — DeepSeek Chats Organizer

**Last updated:** February 2026

This privacy policy explains how the DeepSeek Chats Organizer Chrome extension (the “Extension”) collects, uses, and shares data. This policy is intended to satisfy the Chrome Web Store privacy policy requirements, including disclosing how user data is collected, used, and shared, and identifying any parties with whom data is shared.

## 1. Summary

The Extension helps users organize DeepSeek chats into projects within `chat.deepseek.com`. It stores user-created project names and chat-to-project assignments using Chrome’s storage. It does **not** send data to external servers.

## 2. Data We Collect

The Extension collects and stores the minimum data needed to provide its single purpose: organizing DeepSeek chats into projects.

**Collected data (stored locally and/or via Chrome Sync):**

- **Chat identifiers** (e.g., the chat ID derived from the DeepSeek URL)
- **Chat titles** (text shown in the DeepSeek sidebar)
- **Project names** created by the user
- **Chat-to-project assignments**

**We do not collect:**

- Personally identifiable information (name, email, address, etc.)
- Health or financial information
- Authentication credentials
- Location data
- Web browsing history beyond `chat.deepseek.com`

## 3. How We Use Data

We use the data solely to:

- Display projects and their associated chats
- Enable navigation to chats from the Projects panel
- Persist your organization across sessions and (if enabled) across devices

We do **not** use data for advertising, profiling, or analytics.

## 4. Data Storage and Sync

The Extension uses Chrome’s storage APIs:

- `chrome.storage.sync` for project data and assignments
- `chrome.storage.sync` for the enable/disable flag (so it syncs across devices)

This keeps data associated with the user’s Chrome profile and sync settings. No external backend is used.

## 5. Data Sharing

We do **not** share or sell user data with third parties. The only “sharing” is via Chrome Sync, which is part of the user’s Google account and browser environment.

## 6. Permissions We Request and Why

- **storage**: Store projects and chat-to-project mappings.
- **tabs**: Open `https://chat.deepseek.com/` from the popup and detect the active tab to enable the panel.
- **host permission (`https://chat.deepseek.com/*`)**: Inject the Projects panel on DeepSeek and read chat links.

These are limited to the Extension’s single purpose and do not grant access to unrelated sites or data.

## 7. Data Retention and Deletion

Your project data remains in Chrome storage until you:

- Delete projects/chats inside the Extension
- Disable or uninstall the Extension
- Clear Chrome’s extension storage

## 8. Security

The Extension does not transmit data to external servers. All data is stored via Chrome’s extension storage mechanisms. We do not use remote code execution or load external scripts.

## 9. Children’s Privacy

The Extension is not directed to children and does not knowingly collect personal information from children.

## 10. Changes to This Policy

We may update this policy to reflect changes to the Extension. The updated version will be posted at the same URL with a revised “Last updated” date.

## 11. Contact

If you have questions about this privacy policy, contact:

- **Developer:** Kaleab Nega
- **Email:** kaleabalebachew3@gmail.com

## 12. Compliance Statement

We comply with the Chrome Web Store user data requirements and limit data use to the single purpose of this Extension.

document.addEventListener("DOMContentLoaded", () => {
  const launch = document.getElementById("launch");
  if (!launch) return;

  launch.addEventListener("click", () => {
    chrome.storage.sync.set({ dsco_enabled_v1: true }, () => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs[0];
        if (tab && tab.id && tab.url && tab.url.includes("chat.deepseek.com")) {
          chrome.tabs.sendMessage(tab.id, { type: "dsco:enable" }, () => {
            if (chrome.runtime.lastError) {
              // Content script may not be injected yet; ignore and rely on sync.
            }
          });
        } else {
          chrome.tabs.create({ url: "https://chat.deepseek.com/" });
        }
      });
    });
  });
});

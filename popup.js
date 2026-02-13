document.addEventListener("DOMContentLoaded", () => {
  const launch = document.getElementById("launch");
  if (!launch) return;

  launch.addEventListener("click", () => {
    chrome.storage.local.set({ dsco_enabled_v1: true }, () => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs[0];
        if (tab && tab.id && tab.url && tab.url.includes("chat.deepseek.com")) {
          chrome.tabs.sendMessage(tab.id, { type: "dsco:enable" });
        } else {
          chrome.tabs.create({ url: "https://chat.deepseek.com/" });
        }
      });
    });
  });
});

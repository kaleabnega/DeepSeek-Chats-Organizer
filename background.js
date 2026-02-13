const ENABLE_KEY = "dsco_enabled_v1";

function disableByDefault() {
  chrome.storage.local.set({ [ENABLE_KEY]: false });
}

chrome.runtime.onInstalled.addListener(() => {
  disableByDefault();
});

chrome.runtime.onStartup.addListener(() => {
  disableByDefault();
});

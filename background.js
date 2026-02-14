const ENABLE_KEY = "dsco_enabled_v1";

function disableByDefault() {
  chrome.storage.sync.set({ [ENABLE_KEY]: false });
}

chrome.runtime.onInstalled.addListener(() => {
  disableByDefault();
});

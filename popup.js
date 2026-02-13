document.addEventListener("DOMContentLoaded", () => {
  const launch = document.getElementById("launch");
  if (!launch) return;

  launch.addEventListener("click", () => {
    chrome.tabs.create({ url: "https://chat.deepseek.com/" });
  });
});

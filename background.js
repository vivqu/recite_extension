chrome.action.onClicked.addListener(function () {
  chrome.tabs.create({ url: "settings.html" });
});

chrome.runtime.onInstalled.addListener(function (details) {
  if (details.reason == "install") {
    chrome.tabs.create({ url: "settings.html" });
  }
});

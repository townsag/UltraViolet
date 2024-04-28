//toggle-selections
//blacklist-input

const toggleSelections = document.getElementById("toggle-selections");
chrome.storage.local.get(["isSelected"]).then((result) => {
  if (result.isSelected) toggleSelections.setAttribute("checked", "checked");
  else toggleSelections.removeAttribute("checked");
});
toggleSelections.addEventListener("change", (e) => {
  chrome.storage.local.set({ isSelected: e.target.checked });
});

const blacklistInput = document.getElementById("blacklist-input");
chrome.storage.local.get(["blacklistWords"]).then((result) => {
  console.log(result.blacklistWords);
  blacklistInput.textContent = result.blacklistWords;
});
blacklistInput.addEventListener("change", (e) => {
  console.log(e);
  chrome.storage.local.set({ blacklistWords: e.target.value });
});

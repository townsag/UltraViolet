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

const colorRedRadio = document.getElementById("color-red");
chrome.storage.local.get(["color"]).then((result) => {
  if (result.color === "red") colorRedRadio.setAttribute("checked", "checked");
  else colorRedRadio.removeAttribute("checked");
});
colorRedRadio.addEventListener("change", (e) => {
  chrome.storage.local.set({ color: e.target.value });
});
const colorBlueRadio = document.getElementById("color-blue");
chrome.storage.local.get(["color"]).then((result) => {
  if (result.color === "blue")
    colorBlueRadio.setAttribute("checked", "checked");
  else colorBlueRadio.removeAttribute("checked");
});
colorBlueRadio.addEventListener("change", (e) => {
  chrome.storage.local.set({ color: e.target.value });
});
const colorYellowRadio = document.getElementById("color-yellow");
chrome.storage.local.get(["color"]).then((result) => {
  if (result.color === "yellow")
    colorYellowRadio.setAttribute("checked", "checked");
  else colorYellowRadio.removeAttribute("checked");
});
colorYellowRadio.addEventListener("change", (e) => {
  chrome.storage.local.set({ color: e.target.value });
});
const colorGreenRadio = document.getElementById("color-green");
chrome.storage.local.get(["color"]).then((result) => {
  if (result.color === "green")
    colorGreenRadio.setAttribute("checked", "checked");
  else colorGreenRadio.removeAttribute("checked");
});
colorGreenRadio.addEventListener("change", (e) => {
  chrome.storage.local.set({ color: e.target.value });
});
const colorPurpleRadio = document.getElementById("color-purple");
chrome.storage.local.get(["color"]).then((result) => {
  if (result.color === "purple" || results.color === "")
    colorPurpleRadio.setAttribute("checked", "checked");
  else colorPurpleRadio.removeAttribute("checked");
});
colorPurpleRadio.addEventListener("change", (e) => {
  chrome.storage.local.set({ color: e.target.value });
});

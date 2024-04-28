// USE LOCALSTORAGE FOR CACHE

const tagsToIgnore = [
  "script",
  "meta",
  "audio",
  "canvas",
  "embed",
  "figure",
  "iframe",
  "img",
  "input",
  "map",
  "math",
  "meter",
  "nav",
  "noscript",
  "object",
  "picture",
  "progress",
  "search",
  "select",
  "slot",
  "svg",
  "template",
  "textarea",
  "time",
  "var",
  "video",
];

const htmlPhrasingTags = [
  "abbr",
  "audio",
  "b",
  "bdi",
  "bdo",
  "br",
  "button",
  "canvas",
  "cite",
  "code",
  "data",
  "datalist",
  "dfn",
  "em",
  "embed",
  "i",
  "iframe",
  "img",
  "input",
  "kbd",
  "label",
  "mark",
  "math",
  "meter",
  "noscript",
  "object",
  "output",
  "picture",
  "progress",
  "q",
  "ruby",
  "s",
  "samp",
  "script",
  "select",
  "slot",
  "small",
  "span",
  "strong",
  "sub",
  "sup",
  "svg",
  "template",
  "textarea",
  "time",
  "u",
  "var",
  "video",
  "wbr",
];

function isValidTextNode(node) {
  return (
    node.parentNode &&
    node.parentNode.nodeName !== "SCRIPT" &&
    node.parentNode.nodeName !== "STYLE"
  );
}

function isHighlightElement(element) {
  return element.className === "highlight";
}

function isPhrasingNode(element) {
  return htmlPhrasingTags.includes(element.tagName.toLowerCase());
}

function getTextNodes(rootNode) {
  const nodeIterator = document.createNodeIterator(
    rootNode,
    NodeFilter.SHOW_TEXT,
    { acceptNode: () => NodeFilter.FILTER_ACCEPT },
  );
  const nodes = [];
  let currentNode;
  while ((currentNode = nodeIterator.nextNode())) {
    if (!isValidTextNode(currentNode)) continue;
    const text = currentNode.nodeValue;
    if (
      // ADD MORE CONDITIONS
      text.trim().length <= 0 ||
      isHighlightElement(currentNode.parentElement)
    )
      continue;
    nodes.push(currentNode);
  }
  return nodes;
}

function highlightNode(node) {
  const span = document.createElement("span");
  span.className = "highlight";
  span.textContent = node.nodeValue;
  node.parentNode.replaceChild(span, node);
}

function getParagraphNodes(currentNode) {
  if (tagsToIgnore.includes(currentNode.tagName.toLowerCase())) return [];
  let isParagraphNode = Array.from(currentNode.childNodes).every((node) => {
    return (
      node.nodeType === Node.TEXT_NODE ||
      (node.nodeType === Node.ELEMENT_NODE && isPhrasingNode(node))
    );
  });

  if (isParagraphNode) {
    console.log("isPara", currentNode);
    return [currentNode];
  } else {
    console.log("isNot", Array.from(currentNode.children));
    let children = Array.from(currentNode.children);
    let paragraphNodes = [];
    for (let i = 0; i < children.length; i++) {
      paragraphNodes.push(...getParagraphNodes(children[i]));
    }
    return paragraphNodes;
  }
}

function highlightTextNodes(rootNode) {
  const paragraphNodes = getParagraphNodes(rootNode);
  for (let i = 0; i < paragraphNodes.length; i++) {
    const textNodes = getTextNodes(paragraphNodes[i]);
    for (let j = 0; j < textNodes.length; j++) {
      highlightNode(textNodes[j]);
    }
  }
}

// Mutation Observer

// I ran into a bug that a debounced and time limited observer callback
// fixes (specifically on the the page you're redirected to when you
// click the "Edit this file" button on any file in a github repo).
//
// The bug caused the MutationObserver to detect mutations on an
// infinite loop. Once a mutation is detected on an element, any
// text node within the element is highlighted, but then the element
// is mutated again to replace the highlighted text with plain text
// (maybe by some script on the original page).
function debouncedCallback(callback, wait, limit, limitTimeWindow) {
  let timerId;
  let callCount = 0;
  let startTime = Date.now();
  return (...args) => {
    const now = Date.now();

    // Reset count and if the time window has expired
    if (now - startTime > limitTimeWindow) {
      startTime = now;
      callCount = 0;
    }

    // Check if the function has been called more times than the limit within the time window
    if (callCount >= limit) {
      clearTimeout(timerId);
      return;
    }

    console.log(callCount);
    callCount++;

    clearTimeout(timerId);
    timerId = setTimeout(() => {
      callback(...args);
    }, wait);
  };
}

const rootNode = document.body;
const observerConfig = { attributes: true, childList: true, subtree: true };
const observerCallback = debouncedCallback(
  () => highlightTextNodes(rootNode),
  //(mutationList) => {
  //  for (let i = 0; i < mutationList.length; i++)
  //    highlightTextNodes(mutationList[i].target);
  //},
  100,
  10,
  5000,
);
const observer = new MutationObserver(observerCallback);
highlightTextNodes(rootNode);
observer.observe(rootNode, observerConfig);

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

function findParagraphs(start) {
    // const treeWalker = document.createTreeWalker(start, NodeFilter.SHOW_ELEMENT);
    let paragraphNodes = [];
    let currentNode = start;
    console.log(currentNode);
    console.dir(currentNode);
    // check to see if all the children of the current node are textNodes or 
    // phrasing element nodes
    let isParagraphNode = Array.from(currentNode.childNodes).every((node) => {
        return (node.nodeType === Node.TEXT_NODE) || 
                (node.nodeType === node.ELEMENT_NODE && isPhrasing(node));
    });
    console.log("got here");
    // add caheck for meta style script etc tags
    if (isParagraphNode) {
        console.log("found paragraph node");
        paragraphNodes.push(currentNode);
    } else {
        // using currentNode.children assumes that currentNode is an Element object
        // (not a textContent object like a text or comment node) and only returns 
        // child nodes that are HTML elements
        // The assumption of this code is that all the text elements that we want to
        // aggregate will also be children of an html element node and be without any
        // sibbling nodes that are non-phrasing HTML element nodes
        // this would break for something like <p>some text<p>some more text</p></p>
        // would also break for something like <div>This is some text<p>this is some more text</p></div>
        for(const node of Array.from(currentNode.children)){
            findParagraphs(node);
        }
    }
    return paragraphNodes;
}

function highlightTextNodes(rootNode) {
  const textNodes = getTextNodes(rootNode);
  textNodes.forEach((node) => highlightNode(node));
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
  (mutationList) => {
    for (const mutation of mutationList) {
      highlightTextNodes(mutation.target);
    }
  },
  50,
  100,
  5000,
);
const observer = new MutationObserver(observerCallback);
observer.observe(rootNode, observerConfig);

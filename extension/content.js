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
  "footer",
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
  "a",
];

const highlightClassname = "UV-HIGHLIGHT-TEXT";

function isValidTextNode(node) {
  return (
    node.parentNode &&
    node.parentNode.nodeName !== "SCRIPT" &&
    node.parentNode.nodeName !== "STYLE"
  );
}

function isPhrasingNode(element) {
  return htmlPhrasingTags.includes(element.tagName.toLowerCase());
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
    //console.log("isPara", currentNode);
    return [currentNode];
  } else {
    let children = Array.from(currentNode.children);
    let paragraphNodes = [];
    //console.log("NotPara", children);
    for (let i = 0; i < children.length; i++) {
      paragraphNodes.push(...getParagraphNodes(children[i]));
    }
    return paragraphNodes;
  }
}

// let paragraphNodes = getParagraphNodes(document.body);

function createSpan(textContent, color) {
  let hilightedTextNode = document.createElement("span");
  hilightedTextNode.textContent = textContent;
  hilightedTextNode.style.backgroundColor = color;
  return hilightedTextNode;
}

function classifierFactory(redList, apiEndpoint) {
  return {
    // return true if any of the redlist words are found
    classify(sentance) {
      return redList.some((word) => {
        return sentance.includes(word);
      });
    },
  };
}

function hilightMatchingSentances(classifier, paragraphNode) {
  let sentanceBoundaryReg = /(?<=[.?!]+)/;
  // buffer holds objects with attributes node and text
  let buffer = [];
  let paragraphNodeIterator = document.createNodeIterator(
    paragraphNode,
    NodeFilter.SHOW_TEXT,
  );
  let currentSubNode = paragraphNodeIterator.nextNode();
  while (currentSubNode) {
    let next_node = paragraphNodeIterator.nextNode();
    // ToDo: gunna need to add some checks for empty textContent nodes here
    // this is the case that the current sub node text does not contain any sentance delimeters
    if (!sentanceBoundaryReg.test(currentSubNode.textContent)) {
      buffer.push({ node: currentSubNode, text: currentSubNode.textContent });
      // this is the case that the current sub node contains one or more sentance delimeters
    } else {
      // if a text node contains multiple sentances. Split the text content into multiple sentances then
      // replace the original textContent node with a group of text content nodes, one for each sub sentance.
      // replace all the textContent nodes associated with sentances in the buffer first
      let sentances = currentSubNode.textContent.split(sentanceBoundaryReg);
      let currentSentance =
        buffer.map((pair) => pair.text).join("") + sentances[0];
      // flush the buffer
      if (classifier.classify(currentSentance)) {
        // replace the nodes in the buffer with hilighted nodes
        for (const pair of buffer) {
          hilightedSpan = createSpan(pair.text, "yellow");
          pair.node.parentNode.replaceChild(hilightedSpan, pair.node);
        }
      }
      buffer = [];

      // now that the nodes in the buffer have been handled, handle the sentances in currentNode
      // we split the current textNode with multiple sentances into multiple text nodes each with just one sentance
      // in this case the first string in sentances will always end in a punctuation character
      let newFragment = document.createDocumentFragment();
      // handle the first sentance in sentances, garanteed to have punctuation
      if (classifier.classify(currentSentance)) {
        // add the first sentance to our new nodes array as a hilighted node
        hilightedSpan = createSpan(sentances[0], "yellow");
        newFragment.append(hilightedSpan);
      } else {
        newFragment.append(document.createTextNode(sentances[0]));
      }

      // handle all sentances but the first and last sentance in sentances, garanteed to have punctuation
      for (const middleSentance of sentances.slice(1, -1)) {
        if (classifier.classify(middleSentance)) {
          hilightedSpan = createSpan(middleSentance, "yellow");
          newFragment.append(hilightedSpan);
        } else {
          newFragment.append(document.createTextNode(middleSentance));
        }
      }

      // handle the last sentance in sentances only if sentances is greater than length one
      // if sentances is greater than length one then the last sentance is not garanteed to have punctuation
      if (sentances.length > 1) {
        let lastSentance = sentances[sentances.length - 1];
        if (sentanceBoundaryReg.test(lastSentance)) {
          // handle the case where the last string in the sentance is a complete sentance
          if (classifier.classify(lastSentance)) {
            // add a highligted span to the list of nodes
            hilightedSpan = createSpan(lastSentance, "yellow");
            newFragment.append(hilightedSpan);
          } else {
            newFragment.append(document.createTextNode(lastSentance));
          }
        } else {
          // handle the case where the last string in sentances is a sentance fragment
          sentanceFragmentNode = document.createTextNode(lastSentance);
          newFragment.append(sentanceFragmentNode);
          buffer.push({ node: sentanceFragmentNode, text: lastSentance });
        }
      }

      // replace the text node from this sentance with the dom fragment
      currentSubNode.parentNode.replaceChild(newFragment, currentSubNode);
    }
    currentSubNode = next_node;
  }

  // classify and hilight any remaining nodes in the buffer
  if (buffer.length > 0) {
    let currentSentance = buffer.map((pair) => pair.text).join("");
    if (classifier.classify(currentSentance)) {
      for (const pair of buffer) {
        hilightedSpan = createSpan(pair.text, "yellow");
        pair.node.parentNode.replaceChild(hilightedSpan, pair.node);
      }
    }
  }
}

// let classifier = classifierFactory(["bone"], "asdf");
// for (const node of paragraphNodes) {
//     hilightMatchingSentances(classifier, node);
// }

function isHighlightElement(element) {
  return element.className === highlightClassname;
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
  span.className = highlightClassname;
  span.textContent = node.nodeValue;
  span.setAttribute("title", "UV Detected Persuasive Language");
  node.parentNode.replaceChild(span, node);
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
  // The function bellow highlights text within tagsToIgnore
  // without the context of what it's parents, grandparents,
  // etc. are, thus it's commented out.
  //(mutationList) => {
  //  for (let i = 0; i < mutationList.length; i++)
  //    highlightTextNodes(mutationList[i].target);
  //},
  50,
  90,
  5000,
);
const observer = new MutationObserver(observerCallback);

chrome.storage.local.get(["isSelected"]).then((result) => {
  console.log(result.isSelected);
  if (result.isSelected)
    window.onload = function () {
      setTimeout(() => {
        highlightTextNodes(rootNode);
        observer.observe(rootNode, observerConfig);
      }, 2000);
    };
});

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


function makeSentanceGoups(paragraphNode){
    let sentanceGroups = [];
    let sentanceBoundaryReg = /(?<=[.?!]+)/;
    // buffer holds objects with attributes node and text
    let buffer = []
    let paragraphNodeIterator = document.createNodeIterator(paragraphNode, NodeFilter.SHOW_TEXT);
    let currentSubNode = paragraphNodeIterator.nextNode();
    while(currentSubNode){
        let next_node = paragraphNodeIterator.nextNode();
        // ToDo: gunna need to add some checks for empty textContent nodes here
        // this is the case that the current sub node text does not contain any sentance delimeters
        if (!sentanceBoundaryReg.test(currentSubNode.textContent)) {
            buffer.push({node:currentSubNode, text:currentSubNode.textContent});
        // this is the case that the current sub node contains one or more sentance delimeters
        } else {
            let sentances = currentSubNode.textContent.split(sentanceBoundaryReg);
            // create text nodes for each sentance in sentances
            // replace current node with a dom fragment made of sentances
            // group into sentacne groups
            let newFragment = document.createDocumentFragment();
            let firstSentanceNode = document.createTextNode(sentances[0]);
            
            firstSentanceArray = buffer.map(pair => pair.node);
            firstSentanceArray.push(firstSentanceNode);
            sentanceGroups.push(firstSentanceArray);
            buffer = [];
            newFragment.append(firstSentanceNode);

            for (const sentance of sentances.slice(1, -1)){
                let middleSentanceNode = document.createTextNode(sentance);
                newFragment.append(middleSentanceNode);
                sentanceGroups.push([middleSentanceNode]);
            }

            if (sentances.length > 1) {
                let lastSentance = sentances[sentances.length - 1];
                let lastSentanceNode = document.createTextNode(lastSentance);
                newFragment.append(lastSentanceNode);
                if (sentanceBoundaryReg.test(lastSentance)) {
                    sentanceGroups.push([lastSentanceNode]);
                } else {
                    buffer.push({node:lastSentanceNode, text:lastSentance});
                }
            }

            currentSubNode.parentNode.replaceChild(newFragment, currentSubNode);
        }
        currentSubNode = next_node;
    }
    // group any remaining nodes in the buffer
    if (buffer.length > 0) {
        sentanceGroups.push(buffer.map(pair => pair.node));
    }
    return sentanceGroups;
}


function classifierFactory(redList, apiEndpoint="https://ultraviolettext.tech/predictions") {
    return {
        // return true if any of the redlist words are found
        async classify(sentance) {
            let containsRedlist =  redList.some((word) => sentance.includes(word));
            let prediction;

            try {
                console.log("calling the fetch");
                response = await fetch(apiEndpoint, {
                    method:"POST",
                    headers: {"Content-Type": "application/json",},
                    body: JSON.stringify({"text":[sentance]})
                });
                console.log(response);
                if (!response.ok) {
                    throw new Error(`HTTP error ${response.status}`);
                }
                const data = response.json();
                prediction = data.label;
            } catch (error) {
                console.log("error: ", error);
                prediction = false;
            }
            return containsRedlist || prediction;
        }
    }
}


// classifier is an object returned by the classifier factory
// sentance is an array of textContent Nodes
function classifyAndHilight(classifier, sentanceArray){
    // build the text sentance represented by the list of nodes
    let sentance = sentanceArray.map(node => node.textContent).join("");
    classifier.classify(sentance)
    .then(result => {
        if (result) {
            for(const node in sentanceArray) {
                highlightNode(node);
            }
        }
    });
}


function highlightNode(node) {
  const span = document.createElement("span");
  span.className = "highlight";
  span.textContent = node.nodeValue;
  node.parentNode.replaceChild(span, node);
}

function highlightTextNodes(rootNode) {
  const paragraphNodes = getParagraphNodes(rootNode);
  const classifier = classifierFactory(["addressed"]);
  // paragraphs is an array of arrays of arrays :/
  // each element of paragraphs is a pragraph, or an array of arrays. Rows in the paragraph array
  // represent sentances and each element in the row is a textContent Node in that sentance
  paragraphs = []
  for (const node of paragraphNodes) {
    paragraphs.push(makeSentanceGoups(node));
  }

  for (const paragraph of paragraphs) {
    for (const sentance of paragraph) {
        classifyAndHilight(classifier, sentance);
    }
  }

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
// const observerConfig = { attributes: true, childList: true, subtree: true };
// const observerCallback = debouncedCallback(
//   () => highlightTextNodes(rootNode),
//   // The function bellow highlights text within tagsToIgnore
//   // without the context of what it's parents, grandparents,
//   // etc. are, thus it's commented out.
//   //(mutationList) => {
//   //  for (let i = 0; i < mutationList.length; i++)
//   //    highlightTextNodes(mutationList[i].target);
//   //},
//   50,
//   90,
//   5000,
// );
// const observer = new MutationObserver(observerCallback);

window.onload = function () {
  setTimeout(() => {
    highlightTextNodes(rootNode);
    // observer.observe(rootNode, observerConfig);
  }, 2000);
};

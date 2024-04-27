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

function highlightTextNodes(rootNode) {
  const textNodes = getTextNodes(rootNode);
  textNodes.forEach((node) => highlightNode(node));
}

highlightTextNodes(document.body);

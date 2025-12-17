export function getElement (node) {
	let ret = node;
	if (node.nodeType !== Node.ELEMENT_NODE) {
		ret = ret.parentNode;
	}
	return ret;
}


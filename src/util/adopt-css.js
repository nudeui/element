/**
 * We store adopted stylesheets here to avoid adopting the same style multiple times
 * @type {WeakMap<Document | ShadowRoot, Map<string, CSSStyleSheet | HTMLStyleElement>>}
 */
const adoptedStyleSheets = new WeakMap();

/**
 * Adopt a CSS style to a document or shadow root
 * Does not adopt the same style multiple times
 * @param {string | CSSStyleSheet} style
 * @param {Document | ShadowRoot} root
 * @returns {CSSStyleSheet}
 */
export function adoptCSS (style, root = globalThis.document) {
	if (getSheet(style, root)) {
		// We never want to adopt the same style multiple times
		return;
	}

	/** @type {CSSStyleSheet | HTMLStyleElement} */
	let styleObj = getSheet(style, root, { create: true });

	if (root.adoptedStyleSheets) {
		// Newer browsers
		if (Object.isFrozen(root.adoptedStyleSheets)) {
			// Slightly older browsers
			root.adoptedStyleSheets = [...root.adoptedStyleSheets, styleObj];
		}
		else {
			root.adoptedStyleSheets.push(styleObj);
		}
	}
	else {
		// Older browsers
		let styleRoot = root.nodeType === Node.DOCUMENT_NODE ? root.head : root;
		styleRoot.appendChild(styleObj);
	}

	return styleObj;
}

/**
 * Get a stylesheet object (CSSStyleSheet or HTMLStyleElement) from the adopted stylesheets map
 * @param {string | CSSStyleSheet} style
 * @param {Document | ShadowRoot} root
 * @param {object} [options]
 * @param {boolean} [options.create=false] - Whether to create a new style object if it doesn't exist
 * @returns {CSSStyleSheet | HTMLStyleElement | null}
 */
function getSheet (style, root, { create = false } = {}) {
	let rootAdoptedStyleSheets = adoptedStyleSheets.get(root);

	if (!rootAdoptedStyleSheets) {
		if (!create) {
			return null;
		}

		rootAdoptedStyleSheets = new Map();
		adoptedStyleSheets.set(root, rootAdoptedStyleSheets);
	}

	let styleObj = rootAdoptedStyleSheets.get(style);

	if (styleObj) {
		return styleObj;
	}

	if (!create) {
		return null;
	}

	// If we’re here, we have no existing object and create is true
	if (root.adoptedStyleSheets) {
		// Newer browsers
		if (typeof style === "string") {
			styleObj = new CSSStyleSheet();
			styleObj.replaceSync(style);
		}
	}
	else {
		// Older browsers
		styleObj = document.createElement("style");
		styleObj.textContent = style;
	}

	rootAdoptedStyleSheets.set(style, styleObj);
	return styleObj;
}

/**
 * Recursively adopt style on all shadow roots all the way up to the document
 * @param {string | CSSStyleSheet} style
 * @param {Document | ShadowRoot} root
 */
export function adoptCSSRecursive (style, root = globalThis.document) {
	do {
		root = root.host ?? root;
		root = root.getRootNode();

		adoptCSS(style, root);
	} while (root && root.nodeType !== Node.DOCUMENT_NODE);
}

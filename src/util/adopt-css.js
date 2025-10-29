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

	let rootAdoptedStyleSheets = adoptedStyleSheets.get(root);
	rootAdoptedStyleSheets.set(style, styleObj);

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

	if (root.adoptedStyleSheets) {
		// Newer browsers
		let sheet = rootAdoptedStyleSheets.get(style);

		if (!sheet ) {
			if (!create) {
				return null;
			}

			if (typeof style === "string") {
				sheet = new CSSStyleSheet();
				sheet.replaceSync(style);
				rootAdoptedStyleSheets.set(style, sheet);
				style = sheet;
			}
		}

		return style;
	}
	else {
		// Older browsers
		let styleElement = rootAdoptedStyleSheets.get(style);

		if (!styleElement) {
			if (!create) {
				return null;
			}

			styleElement = document.createElement("style");
			styleElement.textContent = style;
		}

		return styleElement;
	}
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

/**
 * We store adopted stylesheets here to avoid adopting the same style multiple times
 * @type {WeakMap<Document | ShadowRoot, Map<string, CSSStyleSheet | HTMLStyleElement>>}
 */
const adoptedStylesheets = new WeakMap();

/**
 * Adopt a CSS style to a document or shadow root
 * Does not adopt the same style multiple times
 * @param {string | CSSStyleSheet} style
 * @param {Document | ShadowRoot} root
 * @returns {CSSStyleSheet}
 */
export function adoptCSS (style, root = globalThis.document) {
	let rootAdoptedStyleSheets = adoptedStylesheets.get(root);

	if (!rootAdoptedStyleSheets) {
		rootAdoptedStyleSheets = new Map();
		adoptedStylesheets.set(root, rootAdoptedStyleSheets);
	}

	if (root.adoptedStylesheets) {
		let sheet = rootAdoptedStyleSheets.get(style);

		if (!sheet && typeof style === "string") {
			sheet = new CSSStyleSheet();
			sheet.replaceSync(style);
			rootAdoptedStyleSheets.set(style, sheet);
			style = sheet;
		}

		if (!root.adoptedStylesheets.includes(sheet)) {
			// Not already adopted, so we need to adopt it
			if (Object.isFrozen(root.adoptedStylesheets)) {
				// Slightly older browsers
				root.adoptedStylesheets = [...root.adoptedStylesheets, sheet];
			}
			else {
				root.adoptedStylesheets.push(sheet);
			}
		}

		return sheet;
	}
	else {
		// Older browsers
		let styleElement = rootAdoptedStyleSheets.get(style);

		if (!styleElement) {
			styleElement = document.createElement("style");
			styleElement.textContent = style;
			let styleRoot = root.nodeType === Node.DOCUMENT_NODE ? root.head : root;
			styleRoot.appendChild(styleElement);
			rootAdoptedStyleSheets.set(style, styleElement);
		}

		return styleElement;
	}
}

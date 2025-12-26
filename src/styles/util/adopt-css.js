/**
 * Adopt a CSS style to a document or shadow root
 * Does not adopt the same style multiple times
 * @param {string} css
 * @param {Document | ShadowRoot} root
 * @returns {CSSStyleSheet}
 */
export function adoptCSS (style, root = globalThis.document) {
	if (!root.adoptedStyleSheets) {
		return;
	}

	let sheet = cssToSheet(style);
	adoptSheet(sheet, root);
	return sheet;
}

/**
 * @internal
 * @type {Map<string, CSSStyleSheet>}
 */
const sheets = new Map();
/**
 * Memoize CSS strings to CSSStyleSheet objects
 * @param {string | CSSStyleSheet} css
 * @returns {CSSStyleSheet}
 */
export function cssToSheet (css) {
	if (css instanceof CSSStyleSheet) {
		return css;
	}

	let sheet = sheets.get(css);

	if (!sheet) {
		sheet = new CSSStyleSheet();
		sheet.replaceSync(css);
		sheets.set(css, sheet);
	}

	return sheet;
}

/**
 * Adopt a CSSStyleSheet to a document or shadow root.
 * @internal
 * @param {CSSStyleSheet} sheet
 * @param {Document | ShadowRoot} root
 * @returns
 */
export function adoptSheet (sheet, root) {
	if (root.adoptedStyleSheets.includes(sheet)) {
		return;
	}

	if (Object.isFrozen(root.adoptedStyleSheets)) {
		// Slightly older browsers
		root.adoptedStyleSheets = [...root.adoptedStyleSheets, sheet];
	}
	else {
		root.adoptedStyleSheets.push(sheet);
	}
}

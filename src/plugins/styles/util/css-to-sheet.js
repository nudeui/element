/**
 * @internal
 * @type {Map<string, CSSStyleSheet>}
 */
const sheets = new Map();

/**
 * Memoize CSS strings to CSSStyleSheet objects
 * @param {string | CSSStyleSheet | Promise<string>} css
 * @returns {CSSStyleSheet | Promise<CSSStyleSheet>}
 */
export function cssToSheet (css) {
	if (css instanceof Promise) {
		return css.then(css => cssToSheet(css));
	}

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

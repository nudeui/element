import { fetchCSS } from "./fetch-css.js";
import { adoptSheet, cssToSheet } from "./adopt-css.js";

/**
 * Adopt a style by URL
 * @param {string} url
 * @param {Document | ShadowRoot} root
 * @returns {Promise<CSSStyleSheet>}
 */
export async function adoptStyleByUrl (url, root = globalThis.document) {
	let sheet = urlToSheet(url);

	if (sheet instanceof Promise) {
		sheet = await sheet;
	}

	adoptSheet(sheet, root);
	return sheet;
}

/**
 * Memoize CSS strings to CSSStyleSheet objects
 * @internal
 * @type {Map<string, Promise<CSSStyleSheet> | CSSStyleSheet>}
 */
const urlSheets = new Map();

function urlToSheet (url) {
	let sheet = urlSheets.get(url);
	if (!sheet) {
		let css = fetchCSS(url).then(css => {
			// TODO process @imports?
			let sheet = cssToSheet(css);
			urlSheets.set(url, sheet);
			return sheet;
		});
		urlSheets.set(url, css);
	}
	return sheet;
}

import { cachedFetch } from "./cached-fetch.js";
/**
 * @template T
 * @typedef {T | Promise<T>} PromiseOrValue
 *
 * @template R
 * @typedef { R | Iterable<R>} IterableOrValue
 */
/**
 * @typedef StyleObject
 * @type {object}
 * @property {string} [url] - A URL string
 * @property {string | Promise<string>} [css] - A CSS string
 * @property {string} [fullUrl] - The resolved absolute URL
 */
/**
 * Adopt a CSS style to a document or shadow root by URL, CSS string, or CSSStyleSheet object
 * Does not adopt the same style multiple times
 * @param { PromiseOrValue<string | CSSStyleSheet | StyleObject>} ref - A URL string or a reference to a style
 * @param { IterableOrValue<Document | ShadowRoot> } root - One or more document or shadow roots to adopt the style to
 * @returns { PromiseOrValue<CSSStyleSheet> }
 */
export function adoptStyle (ref, root = globalThis.document) {
	if (!ref) {
		return;
	}

	if (ref instanceof Promise) {
		return ref.then(ref => adoptStyle(ref, root));
	}

	let sheet;
	if (ref instanceof CSSStyleSheet) {
		sheet = ref;
	}
	else if (ref.css) {
		sheet = cssToSheet(ref.css);
	}
	else {
		sheet = urlToSheet(ref.fullUrl ?? ref);
	}

	if (sheet instanceof Promise) {
		return sheet.then(sheet => adoptSheet(sheet, root));
	}

	if (!sheet) {
		console.log("No sheet found for", ref);
		return null;
	}

	return adoptSheet(sheet, root);
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

/**
 * Adopt a CSSStyleSheet to a document or shadow root.
 * @internal
 * @param {CSSStyleSheet} sheet
 * @param {IterableOrValue<Document | ShadowRoot>} roots
 * @returns {CSSStyleSheet}
 */
export function adoptSheet (sheet, roots) {
	if (roots?.[Symbol.iterator]) {
		for (let root of roots) {
			adoptSheet(sheet, root);
		}
		return sheet;
	}

	if (roots.adoptedStyleSheets.includes(sheet)) {
		return sheet;
	}

	if (Object.isFrozen(roots.adoptedStyleSheets)) {
		// Slightly older browsers
		roots.adoptedStyleSheets = [...roots.adoptedStyleSheets, sheet];
	}
	else {
		roots.adoptedStyleSheets.push(sheet);
	}

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
		let css = cachedFetch(url).then(css => {
			// TODO process @imports?
			let sheet = cssToSheet(css);
			urlSheets.set(url, sheet);
			return sheet;
		});
		urlSheets.set(url, css);
	}
	return sheet;
}

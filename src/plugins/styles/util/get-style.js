import { cachedFetch } from "./cached-fetch.js";

/**
 * Normalize any supported style input to a style options object.
 * Handles ES module default unwrapping, CSSStyleSheet, string, URL, Promise, and option dicts.
 * @param {CSSStyleSheet | string | URL | Promise | { default: * } | { url?: string | URL, css?: * }} value
 * @param {string | URL} baseUrl
 * @param {object} [defaults] - Default options to merge (e.g. `{ roots: new Set(["shadow"]) }`)
 * @returns {{ url?: string, css?: CSSStyleSheet | string | Promise<string> }}
 */
export function getStyle (value, baseUrl, defaults) {
	// Unwrap ES module default exports
	if ("default" in Object(value)) {
		value = value.default;
	}

	if (value instanceof Promise) {
		// Resolve first, then normalize — the resolved value could be any supported type
		let css = value.then(resolved => {
			let style = getStyle(resolved, baseUrl);
			return (
				style.css ?? (style.url ? cachedFetch(new URL(style.url, baseUrl).href) : undefined)
			);
		});

		return { css, ...defaults };
	}

	if (value instanceof CSSStyleSheet) {
		return { css: value, ...defaults };
	}

	if (value instanceof URL) {
		return { url: value.href, ...defaults };
	}

	if (typeof value === "string") {
		return { url: value, ...defaults };
	}

	// Options dict — normalize URL instances in the url property
	let options = { ...defaults, ...value };

	if (options.url instanceof URL) {
		options.url = options.url.href;
	}

	return options;
}

import { cachedFetch } from "./cached-fetch.js";
import { cssToSheet } from "./css-to-sheet.js";

/**
 * Normalize a style input into an options object with a ready-to-adopt `css` property.
 * For URL-based inputs, `css` is resolved via fetch when `baseUrl` is provided.
 * @param {CSSStyleSheet | string | URL | Promise | { url?: string | URL, css?: * }} value
 * @param {string | URL} baseUrl - Base URL for resolving relative style URLs
 * @param {object} [defaults] - Default options merged into the result
 * @returns {{ css?: CSSStyleSheet | Promise<CSSStyleSheet>, url?: string, fullUrl?: string }}
 */
export function getStyle (value, baseUrl, defaults) {
	if (value instanceof Promise) {
		let css = value.then(resolved => {
			if ("default" in Object(resolved)) {
				// Dynamic import() resolves to a module namespace; unwrap .default
				resolved = resolved.default;
			}

			return getStyle(resolved, baseUrl).css;
		});

		return { ...defaults, css };
	}

	if (value instanceof CSSStyleSheet) {
		return { ...defaults, css: value };
	}

	// URL → coerce to string and fall through
	if (value instanceof URL) {
		value = value.href;
	}

	if (typeof value === "string") {
		let options = { ...defaults, url: value };

		if (baseUrl) {
			options.fullUrl = new URL(value, baseUrl).href;
			options.css = cssToSheet(cachedFetch(options.fullUrl));
		}

		return options;
	}

	// Options dict
	let options = { ...defaults, ...value };

	if (options.url instanceof URL) {
		options.url = options.url.href;
	}

	if (options.url && baseUrl) {
		options.fullUrl = new URL(options.url, baseUrl).href;
		options.css ??= cssToSheet(cachedFetch(options.fullUrl));
	}

	if (typeof options.css === "string") {
		options.css = cssToSheet(options.css);
	}

	return options;
}

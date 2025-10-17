/**
 * We store promises of fetched styles here to avoid fetching the same style multiple times
 * @type {Record<string, string | Promise<string>>}
 */
export const fetchedStyles = {};

// Last resort for relative URLs
const defaultBaseURL = globalThis.document?.location?.href ?? import.meta.url;

/**
 * Fetch a style from a URL or a string
 * @param {string | Promise<string> | {css: string | Promise<string>}} style
 * @param {string | URL} [baseUrl]
 * @returns {string | Promise<string>}
 */
export function fetchCSS (style, baseUrl = defaultBaseURL) {
	let css;

	if (style instanceof Promise) {
		return style;
	}
	else if (style?.css) {
		// The component provides a CSS string (either as a promise or a string)
		return style.css;
	}

	if (typeof style === "string") {
		// URL, either absolute or relative to the component
		let url = new URL(style, baseUrl);
		let fullUrl = url.href;
		css = fetchedStyles[fullUrl];

		if (!css) {
			// Haven't fetched yet
			css = fetchedStyles[fullUrl] = fetch(fullUrl).then(response => response.text());
			css.then(css => (fetchedStyles[fullUrl] = css));
		}
	}

	return css;
}

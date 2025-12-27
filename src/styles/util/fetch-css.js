/**
 * We store promises of fetched styles here to avoid fetching the same style multiple times
 * @type {Record<string, string | Promise<string>>}
 */
export const fetchedStyles = {};

// Last resort for relative URLs
const defaultBaseURL = globalThis.document?.location?.href ?? import.meta.url;

/**
 * Fetch a style from a URL or a string
 * @param {string | Promise<string> | {css: string | Promise<string>}} url
 * @param {string | URL} [baseUrl]
 * @returns {string | Promise<string>}
 */
export function fetchCSS (url, baseUrl = defaultBaseURL) {
	let css;

	if (url instanceof Promise) {
		return url;
	}
	else if (url?.css) {
		// The component provides a CSS string (either as a promise or a string)
		return url.css;
	}

	if (typeof url === "string") {
		// URL, either absolute or relative to the component
		url = new URL(url, baseUrl);
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

/**
 * Like `fetch()`, but memoizes the result
 * @type {Record<string, string | Promise<string>>}
 */
export const fetched = {};

/**
 * Fetch a style from a URL or a string
 * @param {string | URL }} url - An absolute URL string
 * @param {string | URL} [baseUrl]
 * @returns {string | Promise<string>}
 */
export function cachedFetch (fullUrl) {
	let ret = fetched[fullUrl];

	if (!ret) {
		// Haven't fetched yet
		ret = fetched[fullUrl] = fetch(fullUrl).then(response => response.text());
		ret.then(ret => (fetched[fullUrl] = ret));
	}

	return ret;
}

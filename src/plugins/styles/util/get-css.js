import { cachedFetch } from "./cached-fetch.js";

/**
 * Normalize any supported style input type to a CSS value.
 * Handles ES module default unwrapping, CSSStyleSheet, string, and URL.
 * @param {CSSStyleSheet | string | URL | { default: CSSStyleSheet | string | URL }} value
 * @param {string | URL} baseUrl
 * @returns {CSSStyleSheet | string | Promise<string>}
 */
export function getCSS (value, baseUrl) {
	if (value && typeof value === "object" && "default" in value) {
		value = value.default;
	}
	if (value instanceof CSSStyleSheet) {
		return value;
	}
	if (typeof value === "string") {
		return value;
	}
	if (value instanceof URL) {
		// TODO: detect CSS import attribute support and use
		// import(url, { with: { type: "css" } }) when available (see issue #89)
		return cachedFetch(new URL(value, baseUrl).href);
	}
	return value;
}

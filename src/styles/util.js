export * from "./util/fetch-css.js";
export * from "./util/adopt-css.js";

/**
 * Get the class hierarchy from the first HTMLElement subclass to the given class
 * @param {Function} Class
 * @returns {Function[]}
 */
export function getSupers (Class) {
	let classes = [];

	while (Class && Class !== HTMLElement) {
		classes.unshift(Class);
		Class = Object.getPrototypeOf(Class);
	}

	return classes;
}

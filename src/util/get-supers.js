/**
 * Get the class hierarchy to the given class
 * @param {Function} Class
 * @param {Function} [FromClass] Optional class to stop at
 * @returns {Function[]}
 */
export function getSupers (Class, FromClass) {
	let classes = [];

	while (Class && Class !== FromClass) {
		classes.unshift(Class);
		Class = Object.getPrototypeOf(Class);
	}

	return classes;
}

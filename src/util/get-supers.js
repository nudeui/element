/**
 * Get the class hierarchy to the given class, from superclass to subclass
 * @param {Function} Class
 * @param {Function} [FromClass] Optional class to stop at
 * @returns {Function[]}
 */
export function getSupers (Class, FromClass) {
	let classes = [];

	while (Class && Class !== FromClass && Class !== Function.prototype) {
		classes.unshift(Class);
		Class = Object.getPrototypeOf(Class);
	}

	return classes;
}

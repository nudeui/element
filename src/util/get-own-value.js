/**
 * Get the own value of a property (if one exists) without triggering any getters
 * @param {object} object
 * @param {string} name
 * @returns {any}
 */
export function getOwnValue (object, name) {
	let descriptor = Object.getOwnPropertyDescriptor(object, name);
	return descriptor?.value;
}

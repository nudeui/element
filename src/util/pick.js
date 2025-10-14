/**
 * Extracts a subset of properties from an object.
 * @param {object} obj
 * @param {Array<string>} properties
 * @returns {object}
 */
export function pick (obj, properties) {
	if (!properties || !obj) {
		return obj;
	}

	return Object.fromEntries(Object.entries(obj).filter(([key]) => properties.includes(key)));
}

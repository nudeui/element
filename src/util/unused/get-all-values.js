/**
 * Get all values of a given property across the prototype chain.
 * @param {object | Function} obj - An object, class or instance.
 * @param {string | symbol} forMember - The property to get the values of.
 * @returns {any[]} The values of the property across the prototype chain.
 */
export function getAllValues (obj, forMember) {
	let values = [];

	if (Object.hasOwn(obj, forMember)) {
		values.push(obj[forMember]);
	}

	let Super = obj;
	while (Super = getSuperMember(Super, forMember)) {
		values.unshift(Super[forMember]);
	}

	return values;
}

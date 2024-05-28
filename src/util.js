/**
 * Allows handling values in a generic way, whether they are dynamic (functions),
 * or static (plain values)
 * @param {*} value - The value to be handled.
 * @param {Array} callArgs - The arguments that will be passed to `function.call()` if the value is a function.
 * @returns {*}
 */
export function resolveValue (value, callArgs) {
	return typeof value === "function" ? value.call(...callArgs) : value;
}
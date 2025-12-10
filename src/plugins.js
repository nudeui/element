import symbols from "./util/symbols.js";

const { plugins } = symbols.known;

export function hasPlugin (Class, plugin) {
	let Super = Object.getPrototypeOf(Class);

	if (Super && hasPlugin(Super, plugin)) {
		return true;
	}

	if (!Object.hasOwn(Class, plugins)) {
		return false;
	}

	return Class[plugins].has(plugin);
}

export function addPlugin (Class, plugin) {
	if (hasPlugin(Class, plugin)) {
		return;
	}

	if (!Object.hasOwn(Class, plugins)) {
		Class[plugins] = new Set();
	}

	if (plugin.dependencies) {
		for (let dependency of plugin.dependencies) {
			addPlugin(Class, dependency);
		}
	}

	if (plugin.members) {
		extend(Class.prototype, plugin.members);
	}

	if (plugin.membersStatic) {
		extend(Class, plugin.membersStatic);
	}

	Class.hooks.add(plugin.hooks);

	plugin.setup?.call(Class);
}

/**
 * Extend an object with the properties of another object
 * @param {Object} base
 * @param {Object} plugin
 */
function extend (base, plugin) {
	let descriptors = Object.getOwnPropertyDescriptors(plugin);
	Object.defineProperties(base, descriptors);
}

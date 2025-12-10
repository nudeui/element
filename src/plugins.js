import symbols from "./util/symbols.js";

const { plugins } = symbols.known;

export function hasPlugin (Class, plugin) {
	if (Class.super?.hasPlugin?.(plugin)) {
		return true;
	}

	if (!Object.hasOwn(Class, plugins)) {
		return false;
	}

	return Class[plugins].has(plugin);
}

export function addPlugin (Class, plugin) {
	if (Class.hasPlugin(plugin)) {
		return;
	}

	if (!Object.hasOwn(Class, plugins)) {
		Class[plugins] = new Set();
	}

	if (plugin.dependencies) {
		for (let dependency of plugin.dependencies) {
			Class.addPlugin(dependency);
		}
	}

	if (plugin.members) {
		extend(Class, plugin.members);
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
	Object.defineProperties(base, Object.getOwnPropertyDescriptors(plugin));
}

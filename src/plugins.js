export function hasPlugin (Class, plugin) {
	let Super = Object.getPrototypeOf(Class);

	if (Super && hasPlugin(Super, plugin)) {
		return true;
	}

	let plugins = Class.symbols ? Class.symbols.plugins : "pluginsInstalled";

	if (!Object.hasOwn(Class, plugins)) {
		// No plugins installed
		return false;
	}

	return Class[plugins].has(plugin);
}

export function addPlugin (Class, plugin) {
	if (hasPlugin(Class, plugin)) {
		return;
	}

	let plugins = Class.symbols ? Class.symbols.plugins : "pluginsInstalled";

	if (!Object.hasOwn(Class, plugins)) {
		Class[plugins] = new Set();
	}

	if (plugin.dependencies) {
		for (let dependency of plugin.dependencies) {
			addPlugin(Class, dependency);
		}
	}

	if (plugin.provides) {
		extend(Class.prototype, plugin.provides);
	}

	if (plugin.providesStatic) {
		extend(Class, plugin.providesStatic);
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

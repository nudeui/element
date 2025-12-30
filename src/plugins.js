/**
 * @typedef Plugin
 * @type {object}
 * @property {object} [provides] - Methods to add to the class prototype
 * @property {object} [providesStatic] - Methods to add to the class itself
 * @property {object} [hooks] - Hooks to add to the class
 * @property {Plugin[]} [dependencies] - Plugins that this plugin depends on
 */

import symbols from "./symbols.js";
import { defineOwnProperty } from "./util/own.js";
import { getSuper } from "./util/super.js";

/**
 * Check if a plugin is installed on a class
 * @param {FunctionConstructor} Class
 * @param {Plugin} plugin
 * @returns {boolean}
 */
export function hasPlugin (Class, plugin) {
	let Super = getSuper(Class);

	if (Super && hasPlugin(Super, plugin)) {
		return true;
	}

	let plugins = Class.symbols?.plugins ?? symbols.known.plugins;

	return Class[plugins]?.has(plugin);
}

/**
 * Add a plugin to a class
 * @param {FunctionConstructor} Class
 * @param {Plugin | Iterable<Plugin>} ...plugins - One or more plugins to add, in order
 * @returns {void}
 */
export function addPlugin (Class, ...plugin) {
	plugin = plugin.flat();
	if (plugin.length > 1) {
		plugin = plugin.flat();

		for (let p of plugin) {
			addPlugin(Class, p);
		}
		return;
	}

	// If we're here, we only have one plugin
	plugin = plugin[0];

	if (hasPlugin(Class, plugin)) {
		return;
	}

	let plugins = Class.symbols?.plugins ?? symbols.known.plugins;

	if (plugin.dependencies) {
		for (let dependency of plugin.dependencies) {
			addPlugin(Class, dependency);
		}
	}

	defineOwnProperty(Class, plugins, () => new Set());

	Class[plugins].add(plugin);

	if (plugin.provides) {
		extend(Class.prototype, plugin.provides);
	}

	if (plugin.providesStatic) {
		extend(Class, plugin.providesStatic);
	}

	if (plugin.hooks) {
		Class.hooks.add(plugin.hooks);
	}
}

export { addPlugin as addPlugins };

/**
 * Extend an object with the properties of another object
 * @param {Object} base
 * @param {Object} plugin
 */
function extend (base, plugin) {
	// TODO how to handle conflicts?
	// TODO handle data properties separately?
	let descriptors = Object.getOwnPropertyDescriptors(plugin);
	Object.defineProperties(base, descriptors);
}

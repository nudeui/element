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

/**
 * Check if a plugin is installed on a class
 * @param {FunctionConstructor} Class
 * @param {Plugin} plugin
 * @returns {boolean}
 */
export function hasPlugin (Class, plugin) {
	let Super = Object.getPrototypeOf(Class);

	if (Super && hasPlugin(Super, plugin)) {
		return true;
	}

	let plugins = Class.symbols?.plugins ?? symbols.known.plugins;

	return Class[plugins]?.has(plugin);
}

/**
 * Add a plugin to a class
 * @param {FunctionConstructor} Class
 * @param {Plugin} plugin
 * @returns {void}
 */
export function addPlugin (Class, plugin) {
	if (hasPlugin(Class, plugin)) {
		return;
	}

	let plugins = Class.symbols?.plugins ?? symbols.known.plugins;

	if (plugin.dependencies) {
		for (let dependency of plugin.dependencies) {
			addPlugin(Class, dependency);
		}
	}

	defineOwnProperty(Class, plugins, {
		get () {
			return new Set();
		},
	});

	Class[plugins].add(plugin);

	if (plugin.provides) {
		extend(Class.prototype, plugin.provides);
	}

	if (plugin.providesStatic) {
		extend(Class, plugin.providesStatic);
	}

	Class.hooks.add(plugin.hooks);
}

export function addPlugins (Class, plugins) {
	for (let plugin of plugins) {
		addPlugin(Class, plugin);
	}
}

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

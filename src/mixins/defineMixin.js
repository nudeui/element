import { defineLazyProperty } from "./util.js";

export default function defineMixin (Class, config) {
	if (Array.isArray(config)) {
		return config.map(f => defineMixin(Class, f));
	}

	config = typeof config === "function" ? { init: config } : config;
	let {properties, ...hooks} = config;

	if (properties) {
		for (let name in properties) {
			defineLazyProperty(Class.prototype, name, properties[name]);
		}
	}

	if (Class.hooks) {
		if (Class.hooks.add) {
			Class.hooks.add(hooks);
		}
		else {
			// Hooks object not created yet?
			for (let name in hooks) {
				(Class.hooks[name] ??= []).push(hooks[name]);
			}
		}
	}

	return hooks;
}
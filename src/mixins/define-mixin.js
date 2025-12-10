import { defineLazyProperty } from "../util/lazy.js";

export default function defineMixin (Class, config) {
	if (Array.isArray(config)) {
		// Multiple mixins
		return config.map(f => defineMixin(Class, f));
	}

	config = typeof config === "function" ? { firstConnected: config } : config;
	let { properties, prepare, ...hooks } = config;

	if (properties) {
		for (let name in properties) {
			defineLazyProperty(Class.prototype, name, properties[name]);
		}
	}

	if (prepare) {
		prepare.call(Class);
	}

	if (Class.hooks) {
		// Class already supports hooks
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

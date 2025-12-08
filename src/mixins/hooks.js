export default class Hooks {
	/** @type {Record<string, Hook>} */
	hooks = {};

	constructor (hooks) {
		if (hooks) {
			this.add(hooks);
		}
	}

	/**
	 * Schedule one or more callbacks to be executed on one or more hooks
	 *
	 * @param {string} name
	 * @param {function} callback
	 * @void
	 *
	 * @overload
	 * @param {Record<string, function>} hooks
	 * @void
	 */
	add (name, callback) {
		if (!name) {
			return;
		}

		if (typeof name === "object") {
			// Adding multiple hooks at once
			let hooks = name;

			for (let name in hooks) {
				this.add(name, hooks[name]);
			}

			return;
		}

		if (!callback) {
			return;
		}

		name = Hooks.getCanonicalName(name);
		this.hooks[name] ??= new Hook();
		this.hooks[name].add(callback);
	}

	/**
	 * Execute all callbacks on a specific hook
	 * @param {string} name
	 * @param {object} [env]
	 */
	run (name, env) {
		name = Hooks.getCanonicalName(name);
		this.hooks[name]?.run(env);
	}

	// Allow either camelCase, underscore_case or kebab-case for hook names
	static getCanonicalName (name) {
		return name.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`).replace(/-/g, "_");
	}
}

export class Hook extends Set {

	run (env) {
		for (let callback of this) {
			let context = env?.context ?? env;
			callback.call(context, env);
		}
	}

}

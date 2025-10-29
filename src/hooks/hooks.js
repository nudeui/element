// To be moved to mixin
export default class Hooks {
	constructor (hooks) {
		if (hooks instanceof Hooks) {
			return hooks;
		}

		if (hooks) {
			this.add(hooks);
		}
	}

	/**
	 * Schedule one or more callbacks to be executed on one or more hooks
	 * @param {*} name
	 * @param {*} callback
	 * @param {*} first
	 * @returns
	 */
	add (name, callback, first) {
		if (Array.isArray(name)) {
			return name.map(name => this.add(name, callback, first));
		}

		if (Array.isArray(callback)) {
			return callback.map(callback => this.add(name, callback, first));
		}

		if (typeof name === "object") {
			// Adding multiple hooks at once
			let hooks = name;
			first = callback;

			for (let name in hooks) {
				this.add(name, hooks[name], first);
			}

			return;
		}

		if (callback) {
			this[name] ??= [];
			this[name][first ? "unshift" : "push"](callback);
		}
	}

	/**
	 * Execute all callbacks on a specific hook
	 * @param {string} name
	 * @param {object} [env]
	 */
	run (name, env) {
		if (!this[name]) {
			return;
		}

		this[name].forEach(function (callback) {
			callback.call(env?.context ?? env, env);
		});
	}
}

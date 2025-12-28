export default class Hooks {
	/** @type {Map<string, Hook>} */
	hooks = new Map();

	/** @type {Set<string>} */
	ran = new Set();

	/**
	 * A parent hooks object to inherit from, if any.
	 * Any parent hooks will be executed before this object's hooks.
	 * @type {Hooks | null}
	 */
	parent = null;

	constructor (hooks) {
		if (hooks) {
			this.add(hooks);
		}
	}

	/**
	 * Schedule one or more callbacks to be executed on one or more hooks
	 *
	 * @overload
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

		if (Array.isArray(name)) {
			// Same callbacks for multiple hooks
			// Or multiple objects
			for (let hook of name) {
				this.add(hook, callback);
			}
		}
		else if (!callback) {
			if (typeof name === "object") {
				// Adding multiple hooks at once
				let hooks = name;

				for (let name in hooks) {
					this.add(name, hooks[name]);
				}
			}
		}
		else if (Array.isArray(callback)) {
			// Multiple callbacks for a single hook
			for (let cb of callback) {
				this.add(name, cb);
			}
		}
		else {
			// Single hook, single callback
			name = Hooks.getCanonicalName(name);
			if (!this.hooks.has(name)) {
				this.hooks.set(name, new Hook());
			}
			this.hooks.get(name).add(callback);
		}
	}

	/**
	 * Execute all callbacks on a specific hook
	 * @param {string} name
	 * @param {object} [env]
	 */
	run (name, env) {
		name = Hooks.getCanonicalName(name);
		this.ran.add(name);

		this.parent?.run(name, env);

		let baseName = name;
		if (name.startsWith("first_")) {
			baseName = name.slice(6);
			this.hooks.get(name)?.runOnce(env);
		}
		else {
			this.run("first_" + name, env);
			this.hooks.get(name)?.run(env);
		}

		if (baseName !== "*") {
			this.run("*", {hookName: name, ...env});
		}
	}

	hasRun (name = "*") {
		name = Hooks.getCanonicalName(name);
		return this.ran.has(name);
	}

	// Allow either camelCase, underscore_case or kebab-case for hook names
	static getCanonicalName (name) {
		return name.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`).replace(/-/g, "_");
	}
}

export class Hook extends Set {
	/**
	 * Track which contexts the hook has been run on so far
	 * @type {WeakMap<object, WeakSet<Function>>}
	 */
	contexts = new WeakMap();

	run (env) {
		for (let callback of this) {
			let context = env?.context ?? env;
			callback.call(context, env);

			let callbacks = this.contexts.get(context);
			if (!callbacks) {
				callbacks = new WeakSet();
				this.contexts.set(context, callbacks);
			}
			callbacks.add(callback);
		}
	}

	/**
	 * Like run(), but only executes the callback once per context
	 * @param {*} env
	 */
	runOnce (env) {
		for (let callback of this) {
			let context = env?.context ?? env;

			let callbacks = this.contexts.get(context);
			if (callbacks && callbacks.has(callback)) {
				continue;
			}

			callback.call(context, env);
			// TODO what about callbacks added after this?
			if (!callbacks) {
				callbacks = new WeakSet();
				this.contexts.set(context, callbacks);
			}
			callbacks.add(callback);
		}
	}
}

import { getSuper } from "./util/super.js";

export default class Hooks {
	/** @type {Map<string, Hook>} */
	hooks = new Map();

	/** @type {Set<string>} */
	ran = new Set();

	/**
	 * The object this hooks object is attached to.
	 * It is expected that this.owner.hooks === this
	 * @type {object | null}
	 */
	owner = null;

	constructor (owner) {
		this.owner = owner;
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
			let resolved = Hooks.resolve(name);
			let hook = this.hooks.get(resolved.name);
			if (!hook) {
				hook = new Hook();
				this.hooks.set(resolved.name, hook);
			}

			hook.set(callback, resolved.options);
		}
	}

	/**
	 * Execute all callbacks on a specific hook
	 * @param {string} name
	 * @param {object} [env]
	 */
	run (name, env, options) {
		name = toUnderscoreCase(name);
		this.ran.add(name);

		getSuper(this.owner)?.hooks?.run(name, env);

		this.hooks.get(name)?.run(env, options);

		if (name !== "*") {
			this.run("*", { hookName: name, ...env }, options);
		}
	}

	hasRun (name = "*") {
		name = Hooks.getCanonicalName(name);
		return this.ran.has(name);
	}

	// Allow either camelCase, underscore_case or kebab-case for hook names
	static resolve (name) {
		let nameRaw = name;
		let options = {};

		// Convert to underscore_case
		name = toUnderscoreCase(name);

		if (name.startsWith("first_")) {
			options.once = true;
			name = name.slice(6);
		}

		return { nameRaw, name, options };
	}
}

export class Hook extends Map {
	/**
	 * Track which contexts the hook has been run on so far
	 * @type {WeakMap<object, WeakSet<Function>>}
	 */
	contexts = new WeakMap();

	run (env, options) {
		for (let [callback, addOptions] of this) {
			let context = env?.context ?? env;
			let once = options?.once ?? addOptions.once;

			let callbacks = this.contexts.get(context);
			if (once && callbacks?.has(callback)) {
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

function toUnderscoreCase (name) {
	return name.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`).replace(/-/g, "_");
}

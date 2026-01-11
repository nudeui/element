import { getSupers, getSuper } from "./util/super.js";

export default class Hooks {
	/** @type {Map<string, Hook>} */
	hooks = new Map();

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
				hook = new Hook(this);
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

		let Super = getSuper(this.owner);
		Super?.hooks?.run(name, env, options);
		let context = options?.context ?? env?.context ?? this.owner;
		let isStatic = typeof context === "function";

		let hook = this.hooks.get(name);

		if (isStatic) {
			env ??= {};
			env.originalContext = context;
			if (context.prototype instanceof this.owner) {
				// Static hooks are run on subclasses too
				// starting from this.owner down to the entry class
				let supers = [this.owner, ...getSupers(context, this.owner)];

				for (let Super of supers) {
					hook?.run(env, options, Super);
				}
			}
		}

		hook?.run(env, options);

		if (name !== "*") {
			this.run("*", { hookName: name, env }, options);
		}
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

	constructor (owner) {
		super();
		this.owner = owner;
	}

	run (env, options, forceContext) {
		let runContext = forceContext ?? options?.context;
		let fallbackContext = env?.context ?? this.owner.owner;

		for (let [callback, addOptions] of this) {
			let context = runContext ?? addOptions.context ?? fallbackContext;
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

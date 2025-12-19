import Hooks from "./hooks.js";
import { hasPlugin, addPlugin } from "./plugins.js";
import { getSuper } from "./util/super.js";
import symbols from "./util/symbols.js";

const {hooks, plugins, initialized} = symbols.new;

export default function makeExtensible (Class) {
	Object.defineProperty(Class, "hooks", {
		get () {
			if (!Object.hasOwn(this, hooks)) {
				this[hooks] = new Hooks();
				this[hooks].parent = this.super?.hooks;
			}

			return this[hooks];
		},
		set (value) {
			this[hooks] = value;
		},
		configurable: true,
	});

	/** Plugins to install */

	Object.defineProperty(Class, "plugins", {
		get () {
			if (!Object.hasOwn(this, plugins)) {
				this[plugins] = [];
			}

			return this[plugins];
		},
		set (value) {
			this[plugins] = value;
		},
		configurable: true,
	});

	Object.assign(Class, {
		hasPlugin (plugin) {
			return hasPlugin(this, plugin);
		},
		addPlugin (plugin) {
			return addPlugin(this, plugin);
		},
		/**
		 * Code initializing the class that needs to be called as soon as possible after class definition
		 * And needs to be called separately per subclass
		 * @returns {void}
		 */
		setup () {
			if (Object.hasOwn(this, initialized)) {
				return;
			}

			this.super?.setup?.();

			for (let plugin of this.plugins) {
				this.addPlugin(plugin);
			}

			this.hooks.run("setup", this);

			this[initialized] = true;
		},
	});

	Object.defineProperties(Class, {
		/**
		 * Like super, but dynamic
		 */
		super: {
			get: getSuper,
		},
	});

	Object.defineProperties(Class.prototype, {
		/**
		 * Like super, but dynamic
		 */
		super: {
			get: getSuper,
		},
	});
}

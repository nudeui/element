/**
 * Base class for all elements
 */

import * as defineProps from "./props/defineProps.js";
import * as defineEvents from "./events/defineEvents.js";
import * as defineFormBehavior from "./form-behavior/index.js";
import * as shadowStyles from "./styles/shadow.js";
import * as globalStyles from "./styles/global.js";

import { defineLazyProperty } from "./util/lazy.js";
import Hooks from "./mixins/hooks.js";
import { internals, initialized, newKnownSymbols } from "./util/symbols.js";

const { plugins } = newKnownSymbols;

const Self = class NudeElement extends HTMLElement {
	constructor () {
		super();

		this.constructor.setup(); // Last resort
		this.constructor.hooks.run("constructor-static", this.constructor);
		this.constructor.hooks.run("constructor", this);

		if (this.propChangedCallback && this.constructor.props) {
			this.addEventListener("propchange", this.propChangedCallback);
		}

		// We use a microtask so that this executes after the subclass constructor has run as well
		Promise.resolve().then(() => {
			if (!this.constructor.hooks.hasRun("constructed")) {
				this.constructor.hooks.run("constructed", this);
			}
		});
	}

	connectedCallback () {
		if (!this.constructor.hooks.hasRun("constructed")) {
			// If the element starts off connected, this will fire *before* the microtask
			this.constructor.hooks.run("constructed", this);
		}

		this.constructor.hooks.run("connected", this);
	}

	disconnectedCallback () {
		this.constructor.hooks.run("disconnected", this);
	}

	attachInternals () {
		if (this[internals] !== undefined) {
			return this[internals];
		}

		if (HTMLElement.prototype.attachInternals === undefined) {
			// Not supported
			return this[internals] = null;
		}

		try {
			return this[internals] = super.attachInternals();
		}
		catch (error) {
			return this[internals] = null;
		}
	}

	static {
		// Transparently call attachInternals() when the internals property is accessed
		defineLazyProperty(this.prototype, internals, {
			get () {
				return this.attachInternals();
			},
			configurable: true,
			writable: true,
		});
	}

	static hooks = new Hooks();
	static {
		defineLazyProperty(this, "hooks", {
			value: this.hooks,
			get (hooks) {
				return new Hooks(hooks);
			},
			configurable: true,
			writable: true,
		});
	}

	/**
	 * Like super, but dynamic
	 */
	get super () {
		return this.constructor.super?.prototype;
	}

	/**
	 * Like super, but dynamic
	 */
	static get super () {
		let Super = Object.getPrototypeOf(this);
		return Super === Function.prototype ? null : Super;
	}

	/** Plugins to install */
	static plugins = [
		defineProps,
		defineEvents,
		defineFormBehavior,
		shadowStyles,
		globalStyles,
	];

	get allPlugins () {
		return [
			...(this.super?.allPlugins ?? []),
			...(Object.hasOwn(this, "plugins") ? this.plugins : []),
		];
	}

	static hasPlugin (plugin) {
		if (this.super?.hasPlugin?.(plugin)) {
			return true;
		}

		if (!Object.hasOwn(this, plugins)) {
			return false;
		}

		return this[plugins].has(plugin);
	}

	static addPlugin (plugin) {
		if (this.hasPlugin(plugin)) {
			return;
		}

		if (!Object.hasOwn(this, plugins)) {
			this[plugins] = new Set();
		}

		if (plugin.members) {
			extend(this, plugin.members);
		}

		if (plugin.membersStatic) {
			extend(this, plugin.membersStatic);
		}

		this.hooks.add(plugin.hooks);

		plugin.setup?.call(this);
	}

	/**
	 * Code initializing the class that needs to be called as soon as possible after class definition
	 * And needs to be called separately per subclass
	 * @returns {void}
	 */
	static setup () {
		if (Object.hasOwn(this, initialized)) {
			return;
		}

		this.super?.setup?.();

		for (let plugin of this.plugins) {
			this.addPlugin(plugin);
		}

		this.hooks.run("setup", this);

		this[initialized] = true;
	}

	static {
		this.setup();
	}
};

export default Self;

function extend (base, plugin) {
	Object.defineProperties(base, Object.getOwnPropertyDescriptors(plugin));
}

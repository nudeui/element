/**
 * Base class for all elements
 */

import { defineLazyProperty } from "./util/lazy.js";
import Hooks from "./hooks.js";
import { hasPlugin, addPlugin } from "./plugins.js";
import symbols from "./util/symbols.js";

const { initialized } = symbols.new;

export default class NudeElement extends HTMLElement {
	constructor () {
		super();

		this.constructor.setup(); // Last resort
		this.constructor.hooks.run("constructor-static", this.constructor);
		this.constructor.hooks.run("constructor", this);

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

	static symbols = symbols.known;

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
	static plugins = [];

	static hasPlugin (plugin) {
		return hasPlugin(this, plugin);
	}

	static addPlugin (plugin) {
		addPlugin(this, plugin);
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
}

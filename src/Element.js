/**
 * Base class for all elements
 */

import defineProps from "./props/base.js";
import defineEvents from "./events/base.js";
import defineFormBehavior from "./form-behavior/index.js";
import shadowStyles from "./styles/shadow.js";
import globalStyles from "./styles/global.js";

import { defineLazyProperty } from "./util/lazy.js";
import Hooks from "./mixins/hooks.js";
import { hasPlugin, addPlugin } from "./plugins.js";
import symbols from "./util/symbols.js";

const { initialized } = symbols.new;

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

	static {
		this.setup();
	}
};

export default Self;


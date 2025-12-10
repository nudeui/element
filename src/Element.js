/**
 * Base class for all elements
 */
import * as defineProps from "./props/defineProps.js";
import * as defineEvents from "./events/defineEvents.js";
import defineFormAssociated from "./form-associated.js";

import { shadowStyles, globalStyles } from "./styles/index.js";
import { defineLazyProperty } from "./util/lazy.js";
import Hooks from "./mixins/hooks.js";
import { internals, initialized, newKnownSymbols } from "./util/symbols.js";

const { plugins } = newKnownSymbols;

const instanceInitialized = Symbol("instanceInitialized");
const classInitialized = Symbol("classInitialized");

const Self = class NudeElement extends HTMLElement {
	constructor () {
		super();

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
		if (this[internals]) {
			return this[internals];
		}

		return this[internals] = super.attachInternals();
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

	static init () {
		// Stuff that runs once per class
		if (this[classInitialized]) {
			return false;
		}

		if (this.events) {
			defineEvents(this);
		}

		if (this.formAssociated) {
			defineFormAssociated(this);
		}

		this.hooks.run("setup", this);

		return (this[classInitialized] = true);
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

	static hasPlugin (plugin) {
		if (!Object.hasOwn(this, plugins)) {
			return false;
		}

		return this[plugins].has(plugin) || this.super?.hasPlugin?.(plugin);
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

	static {
		this.addPlugin(defineProps);
		this.addPlugin(shadowStyles);
		this.addPlugin(globalStyles);
	}
};

export default Self;

function extend (base, plugin) {
	Object.defineProperties(base, Object.getOwnPropertyDescriptors(plugin));
}

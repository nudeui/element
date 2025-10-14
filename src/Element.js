/**
 * Base class for all elements
 */
import mounted from "./mounted.js";
import props from "./props/defineProps.js";
import formAssociated from "./form-associated.js";
import events from "./events/defineEvents.js";

import { shadowStyles, globalStyles } from "./styles/index.js";
import Hooks from "./mixins/hooks.js";
import { applyMixins } from "./mixins/apply-mixins.js";

const classInitialized = Symbol("classInitialized");

const Self = class NudeElement extends HTMLElement {
	constructor () {
		super();

		if (!this.constructor[classInitialized]) {
			this.constructor.init();
		}

		this.constructor.hooks.run("start", this);

		if (this.propChangedCallback && this.constructor.props) {
			this.addEventListener("propchange", this.propChangedCallback);
		}

		// We use a microtask so that this executes after the subclass constructor has run as well
		Promise.resolve().then(this.constructor.hooks.run("constructed", this));
	}

	connectedCallback () {
		this.constructor.hooks.run("connected", this);
	}

	disconnectedCallback () {
		this.constructor.hooks.run("disconnected", this);
	}

	static mixins = [
		mounted,
		props,
		events,
		formAssociated,
		shadowStyles,
		globalStyles,
	];

	static {
		if (this.globalStyle) {
			this.globalStyles ??= this.globalStyle;
		}

		applyMixins(this);
	}

	static init () {
		// Stuff that runs once per class
		if (this[classInitialized]) {
			return false;
		}

		this.hooks = new Hooks(this.hooks);

		this.hooks.run("setup", this);

		return (this[classInitialized] = true);
	}
};

export default Self;

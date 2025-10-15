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

	static {
		this.init();
	}

	static init () {
		// Stuff that runs once per class
		if (this[classInitialized]) {
			return false;
		}

		// Every child class has to have the mounted mixin applied,
		// but we don't want to share specific child class mixins with all other classes
		this.mixins = [mounted];

		this.hooks = new Hooks(this.hooks);

		if (this.props) {
			this.mixins.push(props);
		}

		if (this.events) {
			this.mixins.push(events);
		}

		if (this.formAssociated) {
			this.mixins.push(formAssociated);
		}

		if (this.styles) {
			this.mixins.push(shadowStyles);
		}

		if (this.globalStyle) {
			this.globalStyles ??= this.globalStyle;
		}

		if (this.globalStyles) {
			this.mixins.push(globalStyles);
		}

		applyMixins(this);

		this.hooks.run("setup", this);

		return (this[classInitialized] = true);
	}
};

export default Self;

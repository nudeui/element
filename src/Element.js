/**
 * Base class for all elements
 */
import defineMixin from "./mixins/defineMixin.js";
import defineProps from "./props/defineProps.js";
import defineFormAssociated from "./formAssociated.js/defineFormAssociated.js";
import defineEvents from "./events/defineEvents.js";

import { shadowStyles, globalStyles } from "./styles/index.js";
import Hooks from "./mixins/hooks.js";

const instanceInitialized = Symbol("instanceInitialized");
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
		if (!this[instanceInitialized]) {
			// Stuff that runs once per element
			this.constructor.hooks.run("init", this);

			this[instanceInitialized] = true;
		}

		this.constructor.hooks.run("connected", this);
	}

	disconnectedCallback () {
		this.constructor.hooks.run("disconnected", this);
	}

	static init () {
		// Stuff that runs once per class
		if (this[classInitialized]) {
			return false;
		}

		this.hooks = new Hooks(this.hooks);

		if (this.props) {
			defineProps(this);
		}

		if (this.events) {
			defineEvents(this);
		}

		if (this.formAssociated) {
			defineFormAssociated(this);
		}

		if (this.styles) {
			defineMixin(this, shadowStyles);
		}

		if (this.globalStyle) {
			this.globalStyles ??= this.globalStyle;
		}

		if (this.globalStyles) {
			defineMixin(this, globalStyles);
		}

		this.hooks.run("setup", this);

		return (this[classInitialized] = true);
	}
};

export default Self;

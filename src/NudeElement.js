/**
 * Base class with no mixins applied
 * Apply mixins by subclassing it and setting the mixins static property
 * ```js
 * class MyElement extends NudeElement {
 * 	static mixins = [MyMixin];
 * }
 * ```
 */
import { applyMixins } from "./mixins/apply.js";

export const initialized = Symbol("is initialized");

export const NudeElement = (SuperClass = HTMLElement) => class MixinElement extends SuperClass {
	constructor () {
		super();

		this.constructor.init();
		this.init();
	}

	get initialized () {
		return Object.hasOwn(this, initialized);
	}

	init () {
		if (this.initialized) {
			return false;
		}

		return this[initialized] = true;
	}

	super (name, ...args) {
		return super[name]?.(...args);
	}

	// To be overridden by subclasses
	mixins = Object.freeze([]);
	mixinsActive = Object.freeze([]);

	static applyMixins (mixins = this.mixins) {
		if (Object.hasOwn(this, "mixinsActive") || !mixins || mixins.length === 0) {
			return;
		}

		applyMixins(this, mixins);
	}

	static get initialized () {
		return Object.hasOwn(this, initialized);
	}

	static init () {
		if (this.initialized) {
			return false;
		}

		this.applyMixins();

		return this[initialized] = true;
	}
};

export default NudeElement();

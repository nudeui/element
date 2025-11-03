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
import getSymbols from "./util/get-symbols.js";

const { initialized } = getSymbols;

export { initialized };

export const Mixin = (Super = HTMLElement) => class NudeElement extends Super {
	constructor () {
		super();

		this.init();
	}

	init () {
		super.init?.();

		// We repeat the logic because we want to be able to just call Class.init() before instances are constructed
		// But also we need to guard against subclasses defining their own init method and forgetting to call super.init()
		if (!Object.hasOwn(this.constructor, initialized)) {
			this.constructor.init();
			this.constructor[initialized] = true;
		}
	}

	// Used to call super methods
	// Do we actually need this?
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

	static init () {
		if (Object.hasOwn(this, initialized)) {
			return false;
		}

		this[initialized] = true;

		this.applyMixins();
	}
};

export default Mixin();

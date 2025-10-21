import defineMixin from "./define-mixin.js";
import { extendClass, isClass } from "../util.js";

export function applyMixins (Class, mixins = Class.mixins) {
	if (!mixins) {
		return;
	}

	if (Array.isArray(mixins)) {
		for (let mixin of mixins) {
			applyMixin(Class, mixin);
		}
	}
	else {
		for (let [mixin, config] of mixins.entries()) {
			applyMixin(Class, mixin, config);
		}
	}
}

export function applyMixin (Class, mixin, config) {
	if (!Object.hasOwn(Class, "mixinsActive")) {
		Class.mixinsActive = [];
	}

	if (Class.mixinsActive.includes(mixin)) {
		// Don't apply the same mixin twice
		return;
	}

	Class.mixinsActive.push(mixin);

	if (typeof mixin === "function" && !isMixinClass(mixin)) {
		mixin = mixin(Class, config);
	}

	if (isMixinClass(mixin)) {
		// Apply any mixins of this class
		if (mixin.mixins) {
			applyMixins(Class, mixin.mixins);
		}

		extendClass(Class, mixin);
	}
	else {
		// Old mixin style
		defineMixin(Class, mixin, config);
	}
}

function isMixinClass (fn) {
	if (!isClass(fn)) {
		return false;
	}

	let proto = Object.getPrototypeOf(fn);

	return proto && proto.prototype instanceof Element;
}

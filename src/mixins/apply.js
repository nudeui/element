import { copyProperties } from "../util/copy-properties.js";
import { getSuper } from "../util/super.js";

export function applyMixins (Class = this, mixins = Class.mixins) {
	if (Object.hasOwn(Class, "mixinsActive") || !mixins?.length) {
		return;
	}

	// Determine applicable mixins first. Mixins without `appliesTo()` are always applicable.
	const applicable = mixins.filter(Mixin => Mixin.appliesTo?.(Class) ?? true);
	if (!applicable.length) {
		return;
	}

	Class.mixinsActive = [];

	// Phase 1: create stubs for all prototype methods from all applicable mixins,
	// so that they can be used as the base function that mixins can extend.
	// In that case, none of the mixins' functions is used as the base function to add side effects to.
	for (const Mixin of applicable) {
		for (const property of Object.getOwnPropertyNames(Mixin.prototype)) {
			if (property === "constructor" || Object.hasOwn(Class.prototype, property)) {
				continue;
			}

			const descriptor = Object.getOwnPropertyDescriptor(Mixin.prototype, property);
			if (typeof descriptor.value !== "function") {
				continue;
			}

			// Only create a stub if the class doesn't already have its own implementation
			Class.prototype[property] = function (...args) {
				getSuper(this, property)?.call(this, ...args);
			};
		}
	}

	// Phase 2: apply all mixins
	for (let Mixin of applicable) {
		applyMixin(Class, Mixin);
	}
}

export function applyMixin (Class, Mixin, force = false) {
	let alreadyApplied = Class.mixinsActive.includes(Mixin);
	if (alreadyApplied && !force) {
		// Already applied
		return;
	}

	copyProperties(Class, Mixin, { recursive: true, prototypes: true });

	if (!alreadyApplied) {
		Class.mixinsActive.push(Mixin);
	}
}

import { extendClass } from "../util/extend-class.js";
import { satisfiedBy } from "../util/get-symbols.js";

export function satisfies (Class, requirement) {
	if (!requirement) {
		// No reqs
		return true;
	}

	switch (typeof requirement === "function") {
		case "function":
			return requirement(Class);
		case "string":
		case "symbol":
			return Class[requirement];
	}

	if (Array.isArray(requirement)) {
		// Array of potential fields (OR)
		return requirement.some(req => satisfies(Class, req));
	}

	return false;
}

/**
 * Apply a bunch of mixins to a class iff it satisfies their protocols
 * @param { FunctionConstructor } Class
 * @param { Array<FunctionConstructor> } [mixins = Class.mixins]
 * @void
 */
export function applyMixins (Class = this, mixins = Class.mixins) {
	if (!mixins?.length) {
		return;
	}

	if (!Object.hasOwn(Class, "mixinsActive")) {
		Class.mixinsActive = [...(Object.getPrototypeOf(Class).mixinsActive || [])];
	}

	const mixinsToApply = mixins.filter(Mixin => !Class.mixinsActive.includes(Mixin) && satisfies(Class, Mixin[satisfiedBy]));

	if (mixinsToApply.length === 0) {
		return false;
	}

	for (const Mixin of mixinsToApply) {
		extendClass(Class, Mixin, {skippedProperties: [satisfiedBy]});
		Class.mixinsActive.push(Mixin);
	}

	return true;
}

export function applyMixin (Class, Mixin) {
	return applyMixins(Class, [Mixin]);
}


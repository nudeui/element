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

export function applyMixins (Class = this, mixins = Class.mixins) {
	if (Object.hasOwn(Class, "mixinsActive") || !mixins?.length) {
		return;
	}

	Class.mixinsActive = [];

	for (let Mixin of mixins) {
		if (satisfies(Class, Mixin[satisfiedBy])) {
			// Not applicable to this class
			continue;
		}

		applyMixin(Class, Mixin);
	}
}

export function applyMixin (Class, Mixin, force = false) {
	let alreadyApplied = Class.mixinsActive.includes(Mixin);
	if (alreadyApplied && !force) {
		// Already applied
		return;
	}

	extendClass(Class, Mixin, {skippedProperties: [satisfiedBy]});

	if (!alreadyApplied) {
		Class.mixinsActive.push(Mixin);
	}
}


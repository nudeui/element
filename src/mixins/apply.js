import { copyProperties } from "../util/copy-properties.js";

export function applyMixins (Class = this, mixins = Class.mixins) {
	if (Object.hasOwn(Class, "mixinsActive") || !mixins?.length) {
		return;
	}

	Class.mixinsActive = [];

	for (let Mixin of mixins) {
		if (Mixin.appliesTo && !Mixin.appliesTo(Class)) {
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

	copyProperties(Class, Mixin, {recursive: true, prototypes: true});

	if (!alreadyApplied) {
		Class.mixinsActive.push(Mixin);
	}
}


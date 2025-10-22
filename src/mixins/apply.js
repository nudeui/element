import { copyProperties } from "../util/copy-properties.js";

export function applyMixins (Class = this, mixins = Class.mixins) {
	if (Object.hasOwn(Class, "mixinsActive") || !Object.hasOwn(this, "mixins")) {
		return;
	}

	Class.mixinsActive = [];
	let methods = {static: {}, instance: {}};

	for (let Mixin of mixins) {
		if (Mixin.autoApply && !Mixin.autoApply(Class)) {
			// Not applicable to this class
			continue;
		}

		if (Class.mixinsActive.includes(Mixin)) {
			// Already applied
			continue;
		}

		copyProperties(Class, Mixin, {recursive: true, prototypes: true});

		Class.mixinsActive.push(Mixin);
	}
}


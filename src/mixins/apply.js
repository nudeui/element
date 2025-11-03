import { copyProperties } from "../util/copy-properties.js";
import { getSuper } from "../util/super.js";

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

	// If the class doesn't have an init() method, add a default one that calls super.init()
	if (!Object.hasOwn(Class.prototype, "init")) {
		Class.prototype.init = function init () {
			getSuper(this, "init")?.call(this);
		};
	}

	copyProperties(Class, Mixin, {recursive: true, prototypes: true});

	if (!alreadyApplied) {
		Class.mixinsActive.push(Mixin);
	}
}


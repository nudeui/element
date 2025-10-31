/**
 * Base class with all mixins applied
 */

import { Mixin as NudeElementMixin } from "./nude-element.js";
import commonMixins from "./common-mixins.js";
import { initialized } from "./nude-element.js";

export const Mixin = (Super = HTMLElement, mixins = commonMixins) => class Element extends NudeElementMixin(Super) {
	static mixins = mixins;

	static init () {
		if (this[initialized]) {
			return;
		}

		// Ensure the class has its own, and is not using the superclass' mixins
		if (this !== Element && Object.hasOwn(this, "mixins")) {
			this.mixins = this.mixins.slice();
		}

		return super.init();
	}
};

export default Mixin();

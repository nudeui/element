/**
 * Base class with all mixins applied
 */

import NudeElement from "./NudeElement.js";

import mounted from "./mounted.js";
import constructed from "./constructed.js";
import props from "./props/defineProps.js";
import formAssociated from "./form-associated.js";
import events from "./events/defineEvents.js";
import { shadowStyles, globalStyles } from "./styles/index.js";

const mixins = [mounted, constructed, props, events, formAssociated, shadowStyles, globalStyles];

const Self = class Element extends NudeElement {
	static mixins = mixins;

	static init () {
		if (this.initialized) {
			return;
		}

		// Ensure the class has its own, and is not using the superclass' mixins
		if (this !== Self) {
			this.mixins = this.mixins.slice();
		}

		return super.init();
	}
};

export default Self;

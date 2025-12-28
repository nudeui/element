/**
 * Allow declaratively specifying plugins via a plugins property
 */

import { addPlugin, defineOwnProperty } from "./index.js";

export const hooks = {
	setup () {
		// Install any plugins in Class.plugins
		if (!this.plugins) {
			return;
		}

		for (let plugin of this.plugins) {
			addPlugin(this, plugin);
		}
	},
}

export const providesStatic = {};

defineOwnProperty(providesStatic, "plugins", () => []);

export default { hooks, providesStatic };

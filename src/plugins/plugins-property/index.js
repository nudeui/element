/**
 * Allow declaratively specifying plugins via a `plugins` property
 */

import { addPlugin, defineOwnProperty } from "../../extensible.js";

const hooks = {
	setup () {
		// Install any plugins in Class.plugins
		if (!Object.hasOwn(this, "plugins")) {
			return;
		}

		for (let plugin of this.plugins) {
			addPlugin(this, plugin);
		}
	},
};

const providesStatic = {};

defineOwnProperty(providesStatic, "plugins", () => []);

export default { hooks, providesStatic };

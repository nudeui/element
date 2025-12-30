/**
 * The plugin that makes a class support plugins
 * So meta!
 */

import Hooks from "../hooks.js";
import { getSuper, getSuperMethod } from "../util/super.js";
import { defineOwnProperty } from "../util/own.js";

const provides = {
	$hook (name, env) {
		// options = { ...options, context: this, shallow: true };
		if (env === undefined) {
			env = this;
		}
		else if (isPlainObject(env)) {
			env.context ??= this;
		}

		this.constructor.hooks.run(name, env);
	},
};

const providesStatic = {
	$hook (name, env) {
		if (env === undefined) {
			env = this;
		}
		else if (isPlainObject(env)) {
			env.context ??= this;
		}

		this.hooks.run(name, env);
	},

	/**
	 * Code initializing the class that needs to be called as soon as possible after class definition
	 * And needs to be called separately per subclass
	 * @returns {void}
	 */
	setup () {
		// super.setup()
		getSuperMethod(this, providesStatic.setup)?.call(this);

		// TODO what about plugins that were added after setup was called?
		if (!this.hooks.hasRun("setup")) {
			this.$hook("setup");
		}
	},
};

defineOwnProperty(providesStatic, "hooks", function () {
	return new Hooks(this);
});

export const base = { provides, providesStatic };
export default base;

function isPlainObject (value) {
	return (
		value !== null &&
		typeof value === "object" &&
		Object.getPrototypeOf(value) === Object.prototype
	);
}

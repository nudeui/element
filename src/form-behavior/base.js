

import symbols from "../plugins/symbols.js";

import internalsPlugin from "../internals/base.js";

const dependencies = [internalsPlugin];

export const { formBehavior } = symbols.known;

const hooks = {
	setup () {
		if (this.formBehavior) {
			this.defineFormBehavior();
		}
	},
};

const providesStatic = {
	formAssociated: true,

	defineFormBehavior (def = this.formBehavior) {
		if (!def) {
			return;
		}

		this[formBehavior] ??= {};

		const env = {context: this, formBehavior: def};
		this.hooks.run("define-form-behavior", env);

		Object.assign(this[formBehavior], env.formBehavior);
	},
};

export default { dependencies, hooks, providesStatic };

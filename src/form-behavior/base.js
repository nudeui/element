

import symbols from "../plugins/symbols.js";

import internalsPlugin from "../internals/base.js";

export const dependencies = [internalsPlugin];

export const { formBehavior } = symbols.known;

export const hooks = {
	setup () {
		if (this.formBehavior) {
			this.defineFormBehavior();
		}
	},
};

export const providesStatic = {
	formAssociated: true,

	defineFormBehavior (def = this[formBehavior] ?? this.formBehavior) {
		if (!def) {
			return;
		}

		const env = {context: this, formBehavior: def};
		this.hooks.run("define-form-behavior", env);

		this[formBehavior] ??= {};
		Object.assign(this[formBehavior], env.formBehavior);
	},
};

export default { dependencies, hooks, providesStatic };

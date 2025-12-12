

import symbols from "../util/symbols.js";
import * as like from "./like.js";
import * as delegate from "./delegate.js";

import internalsPlugin from "../internals/base.js";

export const dependencies = [internalsPlugin];

const { formBehavior } = symbols.known;

export function setup () {
	// TODO decouple these from core functionality
	this.addPlugin(like);
	this.addPlugin(delegate);
}

export const hooks = {
	firstConstructorStatic () {
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

export default { dependencies, setup, hooks, providesStatic };

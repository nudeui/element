import { defineOwnProperty } from "../../extensible.js";
import symbols from "../../symbols.js";

import internalsPlugin from "../internals/index.js";

const dependencies = [internalsPlugin];

export const { formBehavior } = symbols.known;

const hooks = {
	setup () {
		if (Object.hasOwn(this, "formBehavior")) {
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

		const env = { formBehavior: def };
		this.$hook("define-form-behavior", env);

		Object.assign(this[formBehavior], env.formBehavior);
	},
};

defineOwnProperty(providesStatic, formBehavior, () => ({}));

export default { dependencies, hooks, providesStatic };

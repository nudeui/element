import symbols from "../plugins/symbols.js";
import { resolveValue } from "../util/resolve-value.js";
import { getRole } from "./role.js";
import base, { formBehavior } from "./base.js";

const dependencies = [base];

const { internals } = symbols.known;

const hooks = {
	first_connected () {
		if (!this.constructor[formBehavior]) {
			return;
		}

		let { like, role, valueProp = "value", changeEvent = "input" } = this.constructor[formBehavior];

		if (!like) {
			return;
		}

		let source = resolveValue(like, [this, this]);
		if (source && !role) {
			role = source.computedRole ?? getRole(source);
		}

		if (role) {
			// XXX Should we set a default role? E.g. "textbox"?
			this[internals].role = role;
		}

		// Set up value reflection
		this[internals].setFormValue(this[valueProp]);
		source.addEventListener(changeEvent, () => this[internals].setFormValue(this[valueProp]));
	},
};

export default {dependencies, hooks};

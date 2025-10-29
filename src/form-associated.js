/**
 * Mixin to make an element form-associated
 * Handles:
 * - Proxying form-related properties from ElementInternals
 * - Setting the element's default role
 * - Proxying an internal form control for all of the above
 */

import { resolveValue } from "./util/resolve-value.js";
import { delegate } from "./util/delegate.js";
import { getOptions } from "./util/get-options.js";
import getSymbols from "./util/get-symbols.js";

const defaultOptions = {
	like: undefined,
	role: undefined,
	valueProp: "value",
	changeEvent: "input",
	internalsProp: "_internals",
	properties: [
		"labels",
		"form",
		"type",
		"name",
		"validity",
		"validationMessage",
		"willValidate",
	],
};

const { constructed, initialized, init } = getSymbols;

export function appliesTo (Class) {
	return "formAssociated" in Class;
}

export const Mixin = (Super = HTMLElement, { internalsProp = "_internals", configProp = "formAssociated" } = {}) => class FormAssociated extends Super {
	init () {
		this.constructor.init();

		// Give any subclasses a chance to execute
		Promise.resolve().then(() => this[constructed]());
	}

	[constructed] () {
		let { like, role, valueProp, changeEvent } = this.constructor[configProp];
		let internals = (this[internalsProp] ??= this.attachInternals?.());

		if (internals) {
			// Set the element's default role
			let source = resolveValue(like, [this, this]);
			role ??= source?.computedRole;

			if (role) {
				internals.ariaRole = role;
			}

			// Set current form value and update on change
			internals.setFormValue(this[valueProp]);
			let eventTarget = source || this;
			eventTarget.addEventListener(changeEvent, () =>
				internals.setFormValue(this[valueProp]));
		}
	}

	static formAssociated = true;

	static [init] () {
		if (this[initialized]) {
			return;
		}

		this[initialized] = true;

		this[configProp] = getOptions(defaultOptions, this[configProp]);

		delegate(this.prototype, {
			source () {
				return this[internalsProp];
			},
			properties: this[configProp].properties,
			enumerable: true,
		});
	}

	static appliesTo = function (Class) {
		return configProp in Class;
	};
};

Mixin.appliesTo = appliesTo;

export default Mixin();

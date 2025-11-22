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
import { getSymbols, satisfiedBy, internals } from "./util/get-symbols.js";

const defaultOptions = {
	like: undefined,
	role: undefined,
	valueProp: "value",
	changeEvent: "input",
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

export const { constructed, initialized, init, formAssociated } = getSymbols;

export const Mixin = (Super = HTMLElement) => class FormAssociated extends Super {
	constructor () {
		super();
		this.init();
	}

	init () {
		this.constructor[init]();

		// Give any subclasses a chance to execute
		Promise.resolve().then(() => this[constructed]());
	}

	attachInternals () {
		return this[internals] ??= super.attachInternals?.();
	}

	[constructed] () {
		let config = this.constructor[formAssociated] ?? this.constructor.formAssociated;
		let { like, role, valueProp, changeEvent } = config;
		let internals = this[internals] || this.attachInternals();

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

		let config = this[formAssociated] || this.formAssociated;
		if (!config || typeof config !== "object") {
			config = {};
		}

		this[formAssociated] = getOptions(defaultOptions, config);

		delegate(this.prototype, {
			source () {
				return this[internals];
			},
			properties: this[formAssociated].properties,
			enumerable: true,
		});
	}

	static [satisfiedBy] = [formAssociated, "formAssociated"];
};

export default Mixin();

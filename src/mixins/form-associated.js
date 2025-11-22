/**
 * Mixin to make an element form-associated
 * Handles:
 * - Proxying form-related properties from ElementInternals
 * - Setting the element's default role
 * - Proxying an internal form control for all of the above
 */

import { resolveValue } from "../util/resolve-value.js";
import { delegate } from "../util/delegate.js";
import { getOptions } from "../util/get-options.js";
import { newSymbols, satisfiedBy, internals, onApply } from "../util/symbols.js";
import { attachInternals } from "../util/attach-internals.js";

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

export const { constructed, initialized, init, formAssociated } = newSymbols;

export const Mixin = (Super = HTMLElement) => class FormAssociated extends Super {
	constructor () {
		super();
		this.init();
	}

	init () {
		// Give any subclasses a chance to execute
		Promise.resolve().then(() => this[constructed]());
	}

	attachInternals () {
		return attachInternals(this);
	}

	[constructed] () {
		let config = this.constructor[formAssociated] ?? this.constructor.formAssociated;
		let { like, role, valueProp, changeEvent } = config;
		let internals = this[internals] || this.attachInternals();

		if (!this[internals]) {
			return;
		}

		// Set the element's default role
		let source = resolveValue(like, [this, this]);
		role ??= source?.computedRole;

		if (role) {
			this[internals].ariaRole = role;
		}

		// Set current form value and update on change
		this[internals].setFormValue(this[valueProp]);
		let eventTarget = source || this;
		eventTarget.addEventListener(changeEvent, () =>
			this[internals].setFormValue(this[valueProp]));
	}

	static formAssociated = true;

	static [onApply] () {
		let config = this[formAssociated] || this.formAssociated;
		config = !config || typeof config !== "object" ? {} : config;

		this[formAssociated] = getOptions(defaultOptions, config);

		delegate({
			properties: this[formAssociated].properties,
			from: this.prototype,
			to: internals,
			descriptors: Object.getOwnPropertyDescriptors(ElementInternals.prototype),
		});
	}

	static [satisfiedBy] = [formAssociated, "formAssociated"];
};

export default Mixin();

/**
 * Expose form-related ElementInternals properties on the host element
 */
import { delegate } from "../../util/delegate.js";
import symbols from "../../symbols.js";
import base, { formBehavior } from "./base.js";

const { internals } = symbols.known;

const dependencies = [base];

// Find built-in properties to delegate
let objects = [ElementInternals, HTMLInputElement, HTMLSelectElement, HTMLTextAreaElement, HTMLButtonElement];
let props = objects.map(o => new Set(Object.getOwnPropertyNames(o.prototype)));
const defaultProperties = props.reduce((acc, cur) => acc.intersection(cur));
defaultProperties.delete("constructor");

const hooks = {
	first_constructor_static () {
		if (!this.formBehavior) {
			return;
		}

		const properties = this[formBehavior].properties ?? defaultProperties;

		delegate({
			properties,
			from: this.prototype,
			to: internals,
			descriptors: Object.getOwnPropertyDescriptors(ElementInternals.prototype),
		});
	}
};

export default {dependencies, hooks};

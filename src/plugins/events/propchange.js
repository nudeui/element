/**
 * Implement propchange events:
 * Events that fire when a specific prop changes
 */

import { symbols } from "xtensible";
import base, { events } from "./base.js";
import { props } from "../props/index.js";
import PropChangeEvent from "../props/util/PropChangeEvent.js";

const { propchange } = symbols.new;

const dependencies = [base];

const hooks = {
	first_constructor_static () {
		if (!this[events]) {
			return;
		}

		let propchangeEvents = Object.entries(this[events])
			.filter(([name, options]) => options.propchange)
			.map(([eventName, options]) => [eventName, options.propchange]);

		if (propchangeEvents.length > 0) {
			// Shortcut for events that fire when a specific prop changes
			this[propchange] = Object.fromEntries(propchangeEvents);

			for (let eventName in this[propchange]) {
				let propName = this[propchange][eventName];
				let prop = this[props].get(propName);

				if (prop) {
					(prop.eventNames ??= []).push(eventName);
				}
				else {
					throw new TypeError(`No prop named ${propName} in ${this.name}`);
				}
			}
		}
	},

	first_connected () {
		// `onprops.constructed` attaches listeners *after* `props.constructed`'s
		// synchronous drain — without this re-fire, late-bound `on*` handlers
		// miss the initial dispatch. Duplication for pre-connect listeners is
		// the tradeoff.
		for (let eventName in this.constructor[propchange]) {
			let propName = this.constructor[propchange][eventName];
			let value = this[propName];

			if (value === undefined) {
				continue;
			}

			let prop = this.constructor[props].get(propName);
			let detail = {
				element: this,
				source: "initial",
				parsedValue: value,
				oldInternalValue: undefined,
			};

			if (prop.toAttribute) {
				detail.attributeName = prop.toAttribute;
				detail.attributeValue = this.getAttribute?.(prop.toAttribute) ?? null;
				detail.oldAttributeValue = null;
			}

			this.dispatchEvent(new PropChangeEvent(eventName, { name: propName, prop, detail }));
		}
	},
};

export default { dependencies, hooks };

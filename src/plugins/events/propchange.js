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
		// Don't remove: re-fires initial propchange for on*= attribute handlers,
		// which onprops attaches *after* the initial dispatch. Without this,
		// shortcut handlers declared in HTML never see the initial event.
		// Pre-connect imperative listeners receive the event twice.
		for (let eventName in this.constructor[propchange]) {
			let propName = this.constructor[propchange][eventName];
			let value = this[propName];

			if (value === undefined) {
				continue;
			}

			let prop = this.constructor[props].get(propName);
			let detail = { source: "initial", value };
			this.dispatchEvent(new PropChangeEvent(eventName, { name: propName, prop, detail }));
		}
	},
};

export default { dependencies, hooks };

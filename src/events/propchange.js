/**
 * Implement propchange events:
 * Events that fire when a specific prop changes
 */

import symbols from "../util/symbols.js";

const { propchange } = symbols.new;
const { events } = symbols.known;

export const hooks = {
	first_constructor_static () {
		let propchangeEvents = Object.entries(this[events])
			.filter(([name, options]) => options.propchange)
			.map(([eventName, options]) => [eventName, options.propchange]);

		if (propchangeEvents.length > 0) {
			// Shortcut for events that fire when a specific prop changes
			this[propchange] = Object.fromEntries(propchangeEvents);

			for (let eventName in this[propchange]) {
				let propName = this[propchange][eventName];
				let prop = this.props.get(propName);

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
		// Often propchange events have already fired by the time the event handlers are added
		for (let eventName in this.constructor[propchange]) {
			let propName = this.constructor[propchange][eventName];
			let value = this[propName];

			if (value !== undefined) {
				this.constructor.props.firePropChangeEvent(this, eventName, {
					name: propName,
					prop: this.constructor.props.get(propName),
				});
			}
		}
	},
};

export default {hooks};

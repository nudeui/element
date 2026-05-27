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

		// Invert the user's `{eventName: {propchange: propName}}` declaration
		// into `{propName: [eventName, ...]}` — the shape we need at dispatch
		// time, when we have the prop name and want every alias that fires for it.
		let aliases = {};
		for (let [eventName, options] of Object.entries(this[events])) {
			if (!options.propchange) {
				continue;
			}

			let propName = options.propchange;
			if (!this[props].get(propName)) {
				throw new TypeError(`No prop named ${propName} in ${this.name}`);
			}

			(aliases[propName] ??= []).push(eventName);
		}

		if (Object.keys(aliases).length > 0) {
			this[propchange] = aliases;
		}
	},

	constructor () {
		let aliases = this.constructor[propchange];
		if (!aliases) {
			return;
		}

		// Re-dispatch every propchange as its declared alias event(s). The
		// canonical event already inherits coalescing / pause-resume from
		// ElementProps, so the alias rides along for free. Attaching in the
		// `constructor` hook means we catch mount propchanges too — no
		// synthesized catch-up needed.
		this.addEventListener("propchange", event => {
			let aliasNames = aliases[event.name];
			if (!aliasNames) {
				return;
			}

			for (let aliasName of aliasNames) {
				this.dispatchEvent(new PropChangeEvent(aliasName, {
					name: event.name,
					prop: event.prop,
					source: event.source,
					value: event.value,
					oldValue: event.oldValue,
				}));
			}
		});
	},
};

export default { dependencies, hooks };

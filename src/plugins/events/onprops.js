/**
 * Add on* props for UI events, just like native UI events
 */
import propsPlugin from "../props/index.js";
import base from "./base.js";
import symbols from "../../symbols.js";
import { defineOwnProperty } from "../../extensible.js";

const { eventProps } = symbols.new;

const dependencies = [propsPlugin, base];

const hooks = {
	define_event (env) {
		let onprop = env.event.onprop ?? "on" + env.name.toLowerCase();

		if (onprop in this.prototype) {
			// Already defined or native event
			env.event.onprop ??= false;
			return;
		}

		env.event.onprop ??= onprop;
	},

	// Define all on* props together at the end
	define_events_end (env) {
		if (this !== env.originalContext) {
			// Run only on leaf classes
			return;
		}

		let newProps = {};

		for (let name in env.events) {
			let eventDef = env.events[name];
			if (eventDef.onprop === false) {
				continue;
			}
			newProps[eventDef.onprop] = {
				type: {
					is: Function,
					arguments: ["event"],
				},
				reflect: {
					from: true,
				},
			};
		}

		if (Object.keys(newProps).length > 0) {
			this.defineProps(newProps);
		}
	},

	first_connected () {
		// Deal with existing values
		if (!this.constructor[eventProps]) {
			return;
		}

		for (let name in this.constructor[eventProps]) {
			let value = this[name];
			if (typeof value === "function") {
				let eventName = name.slice(2);
				this.addEventListener(eventName, value);
			}
		}

		// Listen for changes
		this.addEventListener("propchange", event => {
			if (this.constructor[eventProps][event.name]) {
				// Implement onEventName attributes/properties
				let eventName = event.name.slice(2);
				let change = event.detail;

				if (change.oldInternalValue) {
					this.removeEventListener(eventName, change.oldInternalValue);
				}

				if (change.parsedValue) {
					this.addEventListener(eventName, change.parsedValue);
				}
			}
		});
	},
};

const providesStatic = {};

defineOwnProperty(providesStatic, eventProps, () => undefined);

export default { dependencies, hooks, providesStatic };

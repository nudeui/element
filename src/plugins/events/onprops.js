/**
 * Add on* props for UI events, just like native UI events
 */
import propsPlugin from "../props/index.js";
import base from "./base.js";
import { symbols } from "xtensible";
import { defineOwnProperty } from "xtensible/util";

const { eventProps } = symbols.new;

const dependencies = [propsPlugin, base];

const hooks = {
	define_event (env) {
		// Add `onprop` properties for events that need to define an on* prop
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

			// Capture the event name in the closure so each on* prop knows
			// which event to attach/detach when its value changes. The
			// `changed` callback runs synchronously inside the write — before
			// `propchange` fires — so handlers set during prop init catch
			// the mount-time propchanges that follow.
			let eventName = name;
			newProps[eventDef.onprop] = {
				type: {
					is: Function,
					arguments: ["event"],
				},
				reflect: {
					from: true,
				},
				changed ({ oldValue, value }) {
					if (oldValue) {
						this.removeEventListener(eventName, oldValue);
					}
					if (value) {
						this.addEventListener(eventName, value);
					}
				},
			};

			this[eventProps] ??= {};
			this[eventProps][eventDef.onprop] = name;
		}

		if (Object.keys(newProps).length > 0) {
			this.defineProps(newProps);
		}
	},
};

const providesStatic = {};

defineOwnProperty(providesStatic, eventProps, () => undefined);

export default { dependencies, hooks, providesStatic };


/**
 * Add on* props for UI events, just like native UI events
 */
import propsPlugin from "../props/base.js";
import base from "./base.js";
import symbols from "../plugins/symbols.js";

const { eventProps } = symbols.new;

const dependencies = [propsPlugin, base];

const hooks = {
	defineEvents (env) {
		let def = env.events;

		let eventPropsArray = Object.keys(def)
			// Is not a native event (e.g. input)
			.filter(name => !("on" + name in this.prototype))
			.map(name => [
				"on" + name,
				{
					type: {
						is: Function,
						arguments: ["event"],
					},
					reflect: {
						from: true,
					},
				},
			]);

		if (eventPropsArray.length > 0) {
			this[eventProps] = Object.fromEntries(eventPropsArray);
			this.defineProps(this[eventProps]);

			this.hooks.add("first-connected", function firstConnected () {

			});
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

export default {dependencies, hooks};

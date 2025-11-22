// To be split into three mixins: A base events mixin, a retargeting mixin, and a propchange event mixin

import { Mixin as PropsMixin } from "../mixins/props/defineProps.js";
// import PropChangeEvent from "../props/PropChangeEvent.js";
import { resolveValue } from "../util.js";
import { pick } from "../util/pick.js";
import { newSymbols, satisfiedBy } from "../util/symbols.js";

const { initialized, eventProps, propEvents, retargetedEvents } = newSymbols;

/**
 *
 * @param {Function<HTMLElement>} Class
 * @param {string} name Event name
 * @param {object} options
 * @returns
 */
function retargetEvent (name, from) {
	if (typeof from === "function") {
		from = { on: from };
	}

	let type = from?.type ?? name;

	return function init () {
		// Event is a subset of another event (either on this element or other element(s))
		let target = resolveValue(from?.on, [this]) ?? this;
		let host = this;
		let listener = event => {
			if (!from.when || from.when(event)) {
				let EventConstructor = from.event ?? event.constructor;
				let source = from.constructor
					? // Construct specific event object
						pick(event, ["bubbles", "cancelable", "composed", "detail"])
					: // Retarget this event
						event;
				let options = Object.assign({}, source, from.options);

				let newEvent = new EventConstructor(name, options);
				host.dispatchEvent(newEvent);
			}
		};

		if (Array.isArray(target)) {
			for (let t of target) {
				t.addEventListener(type, listener);
			}
		}
		else {
			target.addEventListener(type, listener);
		}
	};
}

export const Mixin = (Super = HTMLElement) => class WithEvents extends Super {
	// FIXME these won't apply if we're not using NudeElement somewhere in the inheritance chain
	static mixins = [PropsMixin(Super)];

	constructor () {
		super();
		this.init();
	}

	init () {
		this.constructor.init();

		// Deal with existing values on the on* props
		for (let name in this.constructor[eventProps]) {
			let value = this[name];
			if (typeof value === "function") {
				let eventName = name.slice(2);
				this.addEventListener(eventName, value);
			}
		}

		// Often propchange events have already fired by the time the event handlers are added
		for (let eventName in this.constructor[propEvents]) {
			let propName = this.constructor[propEvents][eventName];
			let value = this[propName];

			if (value !== undefined) {
				this.constructor.props.firePropChangeEvent(this, eventName, {
					name: propName,
					prop: this.constructor.props.get(propName),
				});
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

		for (let fn of this.constructor[retargetedEvents]) {
			fn.call(this);
		}
	}

	[retargetedEvents] = [];

	static defineEvents (events = this.events) {
		let propchange = Object.entries(events)
			.filter(([name, options]) => options.propchange)
			.map(([eventName, options]) => [eventName, options.propchange]);

		if (propchange.length > 0) {
			// Shortcut for events that fire when a specific prop changes
			propchange = Object.fromEntries(propchange);
			this[propEvents] = propchange;

			// This used to be in a setup hook, do we not want it to just run here?
			for (let eventName in propchange) {
				let propName = propchange[eventName];
				let prop = this.props.get(propName);

				if (prop) {
					(prop.eventNames ??= []).push(eventName);
				}
				else {
					throw new TypeError(`No prop named ${propName} in ${this.name}`);
				}
			}
		}

		let eventPropsDef = Object.keys(events)
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

		if (eventPropsDef.length > 0) {
			eventPropsDef = this[eventProps] = Object.fromEntries(eventPropsDef);
			this.defineProps(eventPropsDef);
		}

		this[retargetedEvents] = [];

		for (let [name, options] of Object.entries(events)) {
			if (options.from) {
				this[retargetedEvents].push(retargetEvent(name, options.from));
			}
		}
	}

	static init () {
		if (Object.hasOwn(this, initialized)) {
			return;
		}

		this[initialized] = true;

		// Should this use Object.hasOwn()?
		if (this.events) {
			this.defineEvents();
		}
	}

	static [satisfiedBy] = "events";
};

export default Mixin();

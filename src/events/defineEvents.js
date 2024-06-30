import defineProps from "../props/defineProps.js";
import PropChangeEvent from "../props/PropChangeEvent.js";
import {
	resolveValue,
} from "../util.js";
import {
	pick,
} from "./util.js";
import defineMixin from "../mixins/defineMixin.js";

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
					// Construct specific event object
					? pick(event, ["bubbles", "cancelable", "composed", "detail"])
					// Retarget this event
					: event;
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

	}
}

export default function defineEvents (Class, events = Class.events) {
	let ret = {
		setup: [],
		init: [],
	}

	let propchange = Object.entries(events)
		.filter(([name, options]) => options.propchange)
		.map(([eventName, options]) => [eventName, options.propchange]);

	if (propchange.length > 0) {
		// Shortcut for events that fire when a specific prop changes
		propchange = Object.fromEntries(propchange);

		ret.setup.push(function setup () {
			for (let eventName in propchange) {
				let propName = propchange[eventName];
				let prop = Class.props.get(propName);

				if (prop) {
					(prop.eventNames ??= []).push(eventName);
				}
				else {
					throw new TypeError(`No prop named ${propName} in ${Class.name}`);
				}
			}
		});
	}

	let eventProps = Object.keys(events)
		// Is not a native event (e.g. input)
		.filter(name => !("on" + name in Class.prototype))
		.map(name => [
			"on" + name,
			{
				type: {
					is: Function,
					arguments: ["event"],
				},
				reflect: {
					from: true,
				}
			}
		]);

	if (eventProps.length > 0) {
		eventProps = Object.fromEntries(eventProps);
		defineProps(Class, eventProps);

		ret.init.push(function init () {
			// Deal with existing values
			for (let name in eventProps) {
				let value = this[name];
				if (typeof value === "function") {
					let eventName = name.slice(2);
					this.addEventListener(eventName, value);
				}
			}

			// Often propchange events have already fired by the time the event handlers are added
			for (let eventName in propchange) {
				let propName = propchange[eventName];
				let value = this[propName];

				if (value !== undefined) {
					Class.props.firePropChangeEvent(this, eventName, {
						name: propName,
						prop: Class.props.get(propName),
					});
				}
			}

			// Listen for changes
			this.addEventListener("propchange", event => {
				if (eventProps[event.name]) {
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
		})
	}

	for (let [name, options] of Object.entries(events)) {
		if (options.from) {
			let fn = retargetEvent(name, options.from);
			if (fn) {
				ret.init.push(fn);
			}
		}
	}

	return defineMixin(Class, ret);
}
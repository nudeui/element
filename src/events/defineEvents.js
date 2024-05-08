import Props from "../props/Props.js";
import PropChangeEvent from "../common/PropChangeEvent.js";
import {
	pick,
	resolveValue,
	queueInitFunction,
} from "../util.js";

/**
 *
 * @param {Function<HTMLElement>} Class
 * @param {string} name Event name
 * @param {object} options
 * @returns
 */
export function defineEvent (Class, name, options = {}) {
	let onName = `on${name}`;
	let isImplemented = onName in Class.prototype;

	if (!isImplemented) {
		Props.add(Class, onName, {
			type: Function,
			typeOptions: {
				arguments: ["event"],
			},
			reflect: {
				from: true,
			}
		});
	}

	if (isImplemented && !options.from) {
		// Not much to do here
		return;
	}

	return function init () {
		this.addEventListener("propchange", event => {
			if (!isImplemented) {
				if (event.name === onName) {
					// Implement the oneventname attribute
					let change = event.detail;

					if (change.oldInternalValue) {
						this.removeEventListener(name, change.oldInternalValue);
					}

					if (change.parsedValue) {
						this.addEventListener(name, change.parsedValue);
					}
				}
			}

			if (event.name === options.propchange) {
				// Shortcut for events that fire when a specific prop changes
				this.dispatchEvent(new PropChangeEvent(name, event));
			}
		});

		// Event is a subset of another event (either on this element or another element)
		let from = typeof options.from === "function" ? { on: options.from } : options.from;

		if (from) {
			let target = resolveValue(from?.on ?? this, [this]);
			let host = this;
			let type = from?.type ?? name;

			target.addEventListener(type, event => {
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
			});
		}
	}
}

export default function defineEvents (Class, events = Class.events) {
	let fns = events.map(event => defineEvent(Class, event)).filter(Boolean);
	return queueInitFunction(Class, fns);
}
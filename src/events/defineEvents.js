import defineProps from "../props/defineProps.js";
import PropChangeEvent from "../props/PropChangeEvent.js";
import {
	pick,
	resolveValue,
	queueInitFunction,
	wait,
} from "../util.js";

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
		// Event is a subset of another event (either on this element or another element)
		let target = resolveValue(from?.on ?? this, [this]);
		let host = this;

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

export default function defineEvents (Class, events = Class.events) {
	let fns = [];

	let props = Object.keys(events)
		.filter(name => !("on" + name in Class.prototype))
		.map(name => [
			"on" + name,
			{
				type: Function,
				typeOptions: {
					arguments: ["event"],
				},
				reflect: {
					from: true,
				}
			}
		]);
	let propchange = Object.entries(events)
		.filter(([name, options]) => options.propchange)
		.map(([name, options]) => [options.propchange, name]);

	if (props.length > 0 || propchange.length > 0) {
		props = Object.fromEntries(props);
		propchange = Object.fromEntries(propchange);

		defineProps(Class, props);

		fns.push(function init () {
			// REFACTOR: Some repetition here
			// Deal with existing values
			for (let name in props) {
				let value = this[name];
				if (typeof value === "function") {
					let eventName = name.slice(2);
					this.addEventListener(eventName, value);
				}
			}

			for (let name in propchange) {
				let value = this[name];

				if (value !== undefined) {
					let eventName = propchange[name];
					this.dispatchEvent(new PropChangeEvent(eventName));
				}
			}

			// Listen for changes
			this.addEventListener("propchange", event => {
				if (props[event.name]) {
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

				if (propchange[event.name]) {
					// Shortcut for events that fire when a specific prop changes
					let eventName = propchange[event.name];
					this.dispatchEvent(new PropChangeEvent(eventName, event));
				}
			});
		})
	}

	for (let [name, options] of Object.entries(events)) {
		if (options.from) {
			let fn = retargetEvent(name, options.from);
			if (fn) {
				fns.push(fn);
			}
		}
	}

	return queueInitFunction(Class, fns);
}
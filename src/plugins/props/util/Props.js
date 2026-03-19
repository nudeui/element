import Prop from "./Prop.js";
import PropChangeEvent from "./PropChangeEvent.js";

export default class Props extends Map {
	/**
	 *
	 * @param {HTMLElement} Class The class to define props for
	 * @param {Object} [props] The props to define as an object with the prop name as the key and the prop spec as the value.
	 */
	constructor (Class, props) {
		super();

		this.Class = Class;

		// Define getters and setters for each prop
		if (props) {
			this.add(props);
		}
	}

	get observedAttributes () {
		let attributes = [...this.values()].map(spec => spec.fromAttribute).filter(Boolean);
		return [...new Set(attributes)];
	}

	add (props) {
		if (arguments.length === 2) {
			let [name, spec] = arguments;
			return this.add({ [name]: spec });
		}

		for (let [name, spec] of Object.entries(props)) {
			let prop = new Prop(name, spec, this);
			this.set(name, prop);
			Object.defineProperty(this.Class.prototype, name, prop.getDescriptor());
		}
	}

	attributeChanged (element, name, oldValue) {
		if (!element.isConnected || element.ignoredAttributes.has(name)) {
			// We process attributes all at once when the element is connected
			return;
		}

		// Find relevant props
		let propsFromAttribute = [...this.values()].filter(spec => spec.fromAttribute === name);

		for (let prop of propsFromAttribute) {
			prop.set(element, element.getAttribute(name), { source: "attribute", name, oldValue });
		}
	}

	eventDispatchQueue = new WeakMap();

	/**
	 * Called when a prop value changes. Fires propchange events.
	 * Dependency propagation is handled automatically by signals.
	 */
	propChanged (element, prop, change) {
		// Fire propchange event
		let eventNames = ["propchange", ...(prop.eventNames ?? [])];
		for (let eventName of eventNames) {
			this.firePropChangeEvent(element, eventName, {
				name: prop.name,
				prop,
				detail: change,
			});
		}
	}

	firePropChangeEvent (element, eventName, eventProps) {
		let event = new PropChangeEvent(eventName, eventProps);

		if (element.isConnected && eventProps.prop.initialized) {
			element.dispatchEvent?.(event);
		}
		else {
			let queue = this.eventDispatchQueue.get(element) ?? [];
			queue.push(event);
			this.eventDispatchQueue.set(element, queue);
		}
	}

	initializeFor (element) {
		if (element.hasAttribute) {
			// Update all reflected props from attributes at once
			for (let name of this.observedAttributes) {
				// Only process elements that have this attribute, or used to
				if (element.hasAttribute(name)) {
					this.attributeChanged(element, name);
				}
			}
		}

		// Fire propchange events for any props not already handled
		for (let prop of this.values()) {
			prop.initializeFor(element);
		}

		// Dispatch any events that were queued
		let queue = this.eventDispatchQueue.get(element);

		if (queue) {
			for (let event of queue) {
				element.dispatchEvent?.(event);
			}

			this.eventDispatchQueue.delete(element);
		}
	}
}

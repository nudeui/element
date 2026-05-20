import ElementProp from "./ElementProp.js";
import PropChangeEvent from "./PropChangeEvent.js";

export default class ElementProps {
	#paused = false;

	/**
	 * Per-element queue of propchange events awaiting dispatch while paused or before init.
	 * @type {PropChangeEvent[]}
	 */
	eventDispatchQueue = [];

	constructor (element) {
		this.element = element;

		// Update all reflected props from attributes at once
		for (let name of this.observedAttributes) {
			// Only process elements that have this attribute, or used to
			if (element.hasAttribute(name)) {
				this.attributeChanged(element, name);
			}
		}

		// Fire propchange events for any props not already handled
		for (let prop of this.values()) {
			prop.initializeFor(element);
		}

		this.resumeEvents(element);
	}

	get spec () {
		return this.element.constructor.props;
	}

	/**
	 * Dispatch (or queue, if paused or not yet initialized) a propchange-style event.
	 * @param {HTMLElement} element
	 * @param {string} eventName
	 * @param {{name: string, prop: Prop, detail: Object}} eventProps
	 */
	firePropChangeEvent (element, eventName, eventProps) {
		let event = new PropChangeEvent(eventName, eventProps);

		if (!this.#paused.has(element) && eventProps.prop.initialized) {
			element.dispatchEvent?.(event);
		}
		else {
			let queue = this.eventDispatchQueue ?? [];
			queue.push(event);
			this.eventDispatchQueue = queue;
		}
	}

	/**
	 * Hold propchange event dispatch for an element; events are queued and flushed on resume.
	 * @param {HTMLElement} element
	 */
	pauseEvents () {
		this.#paused = true;
	}

	/**
	 * Resume propchange event dispatch for an element and flush any queued events.
	 * @param {HTMLElement} element
	 */
	resumeEvents () {
		this.#paused = false;

		let queue = this.eventDispatchQueue;
		if (!queue) {
			return;
		}

		for (let event of queue) {
			this.element.dispatchEvent?.(event);
		}

		this.eventDispatchQueue = [];
	}

	/**
	 * Propagate an observed attribute change to every prop reflected from it.
	 * @param {HTMLElement} element
	 * @param {string} name Attribute name.
	 * @param {string | null} [oldValue]
	 */
	attributeChanged (element, name, oldValue) {
		if (!element.isConnected || element.ignoredAttributes.has(name)) {
			// We process attributes all at once when the element is connected
			return;
		}

		// Find relevant props
		let propsFromAttribute = [...this.values()].filter(spec => spec.reflect.from === name);

		for (let prop of propsFromAttribute) {
			prop.set(element, element.getAttribute(name), {
				source: "attribute",
				name,
				oldAttributeValue: oldValue,
			});
		}
	}

	/**
	 * Fire propchange events for `prop` and cascade updates to any dependents.
	 * @param {Prop} prop The prop that changed.
	 * @param {Object} change Change descriptor (see {@link Prop#set}).
	 */
	propChanged (prop, change) {
		// Source-first: fire before cascading so listeners hear the written prop first.
		let eventNames = ["propchange", ...(prop.eventNames ?? [])];
		for (let eventName of eventNames) {
			this.firePropChangeEvent(this.element, eventName, {
				name: prop.name,
				prop,
				detail: change,
			});
		}

		// Update all props that have this prop as a dependency
		let dependents = this.dependents[prop.name] ?? new Set();

		for (let dependent of dependents) {
			if (dependent.dependsOn(prop, this.element)) {
				dependent.update(this.element, prop);
			}
		}
	}
}

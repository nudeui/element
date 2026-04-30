import Prop from "./Prop.js";
import PropChangeEvent from "./PropChangeEvent.js";
import PropsUpdateEvent from "./PropsUpdateEvent.js";

export default class Props extends Map {
	#eventDispatchQueue = new WeakMap();
	#pendingElements = new Set();
	#drainScheduled = false;

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

	/**
	 * Called from Prop#changed when a value settles. Coalesces into the
	 * dispatch queue; dispatch happens in #drainFor on the next microtask.
	 */
	propChanged (element, prop, change) {
		let map = this.#eventDispatchQueue.get(element);
		if (!map) {
			map = new Map();
			this.#eventDispatchQueue.set(element, map);
		}

		let existing = map.get(prop.name);
		if (existing) {
			// Coalesce: latest parsedValue/source wins, but old values stay pinned
			// to the first write so the payload spans the full first→last delta.
			let { oldInternalValue, oldAttributeValue } = existing.detail;
			Object.assign(existing.detail, change);
			existing.detail.oldInternalValue = oldInternalValue;
			existing.detail.oldAttributeValue = oldAttributeValue;
		}
		else {
			// Capture the old attribute value before any coalesced reflection overwrites it.
			let detail = { ...change };
			if (prop.toAttribute && detail.source !== "attribute") {
				detail.attributeName = prop.toAttribute;
				detail.oldAttributeValue = element.getAttribute?.(prop.toAttribute) ?? null;
			}

			map.set(prop.name, { name: prop.name, prop, detail });
		}

		this.#pendingElements.add(element);
		this.#scheduleDrain();
	}

	#scheduleDrain () {
		if (this.#drainScheduled) {
			return;
		}

		this.#drainScheduled = true;
		queueMicrotask(() => {
			this.#drainScheduled = false;
			this.#drain();
		});
	}

	#drain () {
		// Snapshot and clear: events queued by handlers (incl. on other
		// elements) run on the next microtask, not in this drain.
		let elements = [...this.#pendingElements];
		this.#pendingElements.clear();

		let i = 0;
		try {
			for (; i < elements.length; i++) {
				this.#drainFor(elements[i]);
			}
		}
		finally {
			// If a #drainFor threw, re-queue the survivors so an unrelated
			// future write isn't required to surface their pending events.
			for (let j = i + 1; j < elements.length; j++) {
				this.#pendingElements.add(elements[j]);
			}

			if (this.#pendingElements.size > 0) {
				this.#scheduleDrain();
			}
		}
	}

	#drainFor (element) {
		if (!element.isConnected) {
			// Queue stays intact; `connected()` drains it on (re)connect.
			return;
		}

		let map = this.#eventDispatchQueue.get(element);
		if (!map) {
			return;
		}

		// Reflect first so propchange handlers see settled DOM.
		for (let [, payload] of map) {
			let { prop, detail } = payload;
			if (!prop.toAttribute || detail.source === "attribute") {
				continue;
			}

			// Read from the signal, not from `detail.parsedValue`: an external
			// setAttribute since the payload was queued may have updated the signal.
			let value = prop.stringify(prop.getSignal(element).value);
			let current = element.getAttribute?.(prop.toAttribute);
			if (current === value) {
				continue;
			}

			element.ignoredAttributes.add(prop.toAttribute);
			if (value === null) {
				element.removeAttribute?.(prop.toAttribute);
			}
			else {
				element.setAttribute?.(prop.toAttribute, value);
			}

			element.ignoredAttributes.delete(prop.toAttribute);
		}

		// Detach the queue before dispatch: re-entrant writes from event
		// handlers must accumulate for the next drain, not this one.
		let entries = [...map];
		this.#eventDispatchQueue.delete(element);

		let remaining;
		let changedProps = new Map();
		for (let [key, payload] of entries) {
			// Plain Signals don't dedupe coalesced round-trips on their own;
			// mirror Signal equality here.
			let { prop, detail } = payload;
			if (prop.equals(detail.parsedValue, detail.oldInternalValue)) {
				continue;
			}

			// `initializeFor` is the only thing that flips `prop.initialized`,
			// and it calls `#drainFor` itself — re-queueing here would loop.
			if (!prop.initialized) {
				(remaining ??= new Map()).set(key, payload);
				continue;
			}

			changedProps.set(prop.name, payload);

			// Materialize attributeValue now that reflection has settled the DOM.
			if (detail.attributeName) {
				detail.attributeValue = element.getAttribute?.(detail.attributeName) ?? null;
			}

			// EventTarget isolates listener throws — siblings stay safe without try/catch.
			for (let name of ["propchange", ...(prop.eventNames ?? [])]) {
				element.dispatchEvent?.(new PropChangeEvent(name, payload));
			}
		}

		if (changedProps.size > 0) {
			element.dispatchEvent?.(new PropsUpdateEvent(changedProps));
		}

		if (remaining) {
			// Newer payloads queued by dispatch handlers win; only fill the gaps.
			let current = this.#eventDispatchQueue.get(element);
			if (current) {
				for (let [key, payload] of remaining) {
					if (!current.has(key)) {
						current.set(key, payload);
					}
				}
			}
			else {
				this.#eventDispatchQueue.set(element, remaining);
			}
		}
	}

	connected (element) {
		this.#drainFor(element);
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

		// Every prop is now initialized; release any payloads that were held back.
		this.#drainFor(element);
	}
}

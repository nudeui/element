import Prop from "./Prop.js";
import PropChangeEvent from "./PropChangeEvent.js";
import PropsChangeEvent from "./PropsChangeEvent.js";

export default class Props extends Map {
	/**
	 * Per-element propchange events buffered between `propChanged` and the
	 * synchronous drain at end of the originating write. Buffering — not
	 * coalescing — lets all transitive Computeds settle before the first
	 * propchange fires, so handlers see post-cascade values via `this[name]`.
	 * @type {WeakMap<HTMLElement, Array<{name: string, prop: Prop, detail: object}>>}
	 */
	#propchangeQueue = new WeakMap();

	/** @type {Set<HTMLElement>} Elements with a pending sync drain. */
	#pendingPropchangeElements = new Set();

	/** Re-entrancy guard: nested `drain` calls are absorbed by the outer. */
	#drainInProgress = false;

	/**
	 * Per-element propschange accumulator. Maps prop name → first-seen
	 * oldValue, pinned across all sync writes in the current tick so the
	 * dispatched payload spans a tick-wide first→last delta.
	 * @type {WeakMap<HTMLElement, Map<string, *>>}
	 */
	#pendingChangedProps = new WeakMap();

	/** @type {Set<HTMLElement>} Elements with a pending propschange dispatch. */
	#pendingPropschangeElements = new Set();

	/** Microtask-schedule guard for the propschange drain. */
	#propschangeScheduled = false;

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
			prop.set(element, element.getAttribute(name), {
				source: "attribute",
				name,
				oldAttributeValue: oldValue,
			});
		}

		this.drain();
	}

	/**
	 * Called from `Prop#changed` when a value settles. Queues the per-prop
	 * `propchange` payload for synchronous drain at end of the originating
	 * write, and accumulates into the per-tick `propschange` summary
	 * (drained on a microtask).
	 */
	propChanged (element, prop, change) {
		let queue = this.#propchangeQueue.get(element);
		if (!queue) {
			queue = [];
			this.#propchangeQueue.set(element, queue);
		}
		queue.push({ name: prop.name, prop, detail: change });
		this.#pendingPropchangeElements.add(element);

		let map = this.#pendingChangedProps.get(element);
		if (!map) {
			map = new Map();
			this.#pendingChangedProps.set(element, map);
		}
		// First-seen oldValue wins so propschange covers the full tick-wide
		// delta even across coalesced sync writes.
		if (!map.has(prop.name)) {
			map.set(prop.name, change.oldValue);
		}
		this.#pendingPropschangeElements.add(element);
		this.#schedulePropschange();
	}

	/**
	 * Synchronously dispatch all queued `propchange` events for connected
	 * elements. Re-entrant calls (from inside a propchange handler) are
	 * absorbed by the outer drain, which keeps looping until handlers stop
	 * queuing new events.
	 */
	drain () {
		if (this.#drainInProgress) {
			return;
		}

		this.#drainInProgress = true;
		try {
			while (this.#pendingPropchangeElements.size > 0) {
				let pending = [...this.#pendingPropchangeElements];
				this.#pendingPropchangeElements.clear();
				for (let element of pending) {
					if (element.isConnected) {
						this.#dispatchPropchanges(element);
					}
					// Disconnected: leave queue intact for `connected()` to drain on reconnect.
				}
			}
		}
		finally {
			this.#drainInProgress = false;
		}
	}

	#dispatchPropchanges (element) {
		let queue = this.#propchangeQueue.get(element);
		if (!queue) {
			return;
		}

		// Detach before dispatch so re-entrant writes from handlers land
		// in a fresh queue and surface on the next drain iteration.
		this.#propchangeQueue.delete(element);

		for (let payload of queue) {
			// EventTarget isolates listener throws — siblings stay safe without try/catch.
			for (let name of ["propchange", ...(payload.prop.eventNames ?? [])]) {
				element.dispatchEvent(new PropChangeEvent(name, payload));
			}
		}
	}

	#schedulePropschange () {
		if (this.#propschangeScheduled) {
			return;
		}
		this.#propschangeScheduled = true;
		queueMicrotask(() => {
			this.#propschangeScheduled = false;
			this.#drainPropschange();
		});
	}

	#drainPropschange () {
		let pending = [...this.#pendingPropschangeElements];
		this.#pendingPropschangeElements.clear();
		for (let element of pending) {
			this.#dispatchPropschangeFor(element);
		}
	}

	#dispatchPropschangeFor (element) {
		if (!element.isConnected) {
			// Leave the accumulator intact. Don't re-add to pending — that
			// would pin a strong reference to a disconnected element.
			// `connected()` checks `#pendingChangedProps` directly on reconnect.
			return;
		}

		let map = this.#pendingChangedProps.get(element);
		if (!map) {
			return;
		}
		this.#pendingChangedProps.delete(element);

		let changedProps = new Map();
		for (let [name, oldValue] of map) {
			let prop = this.get(name);
			// Skip round-trips: prop is back at its first-seen old value, net no-op.
			if (prop && prop.equals(element[name], oldValue)) {
				continue;
			}
			changedProps.set(name, oldValue);
		}

		if (changedProps.size > 0) {
			element.dispatchEvent(new PropsChangeEvent("propschange", { changedProps }));
		}
	}

	connected (element) {
		// Drain any propchange events that landed while disconnected.
		if (this.#propchangeQueue.has(element)) {
			this.#dispatchPropchanges(element);
			this.#pendingPropchangeElements.delete(element);
		}
		// Fire any pending propschange summary now that the element is observable.
		// Pull from the per-element accumulator directly — the element may not be
		// in `#pendingPropschangeElements` if the deferred microtask already saw
		// it disconnected and skipped without re-adding.
		if (this.#pendingChangedProps.has(element)) {
			this.#pendingPropschangeElements.delete(element);
			this.#dispatchPropschangeFor(element);
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

		// Mount is a discrete event — drain both tiers synchronously so
		// callers see the settled initial state without an extra await.
		this.drain();
		this.#dispatchPropschangeFor(element);
	}
}

import Prop from "./Prop.js";
import PropChangeEvent from "./PropChangeEvent.js";
import PropsChangeEvent from "./PropsChangeEvent.js";

export default class Props extends Map {
	/**
	 * Per-element coalescing buffer: prop name → payload with the latest
	 * value/source and the first-seen oldValue. While the element is active
	 * (default), `drain` empties the queue immediately after the originating
	 * write so handlers see one propchange per prop with post-cascade values.
	 * While the element is paused (e.g. disconnected), writes accumulate so
	 * resume dispatches one coalesced event per prop, with `oldValue` pinned
	 * to the value before pause and `value` the final post-resume state.
	 * @type {WeakMap<HTMLElement, Map<string, {name: string, prop: Prop, detail: object}>>}
	 */
	#propchangeQueue = new WeakMap();

	/**
	 * Elements with change monitoring paused — propchange/propschange
	 * dispatch is held until `resume`. Lifecycle wires `disconnected` →
	 * `pause` and `connected` → `resume` so writes while detached coalesce
	 * into a single per-prop event on reconnect.
	 * @type {WeakSet<HTMLElement>}
	 */
	#paused = new WeakSet();

	/**
	 * Per-element re-entrancy guard for `drain`. Nested writes on the same
	 * element (e.g. a propchange handler that writes back to its own prop)
	 * fall back to the outer drain; writes on a *different* element get
	 * their own drain, since their cascade and queue are independent.
	 * @type {WeakSet<HTMLElement>}
	 */
	#draining = new WeakSet();

	/**
	 * Per-element propschange accumulator. Maps prop name → first-seen
	 * oldValue, pinned across all sync writes in the current tick (or pause
	 * period) so the dispatched payload spans the full delta.
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

		this.drain(element);
	}

	/**
	 * Called from `Prop#changed` when a value settles. Coalesces into the
	 * per-element propchange queue (latest value/source wins, oldValue
	 * pinned to first-seen) and accumulates into the propschange summary.
	 * For active elements, `drain` runs after the originating write and
	 * dispatches before the next write can queue, so each write fires its
	 * own event; for paused elements, writes coalesce until `resume`.
	 */
	propChanged (element, prop, change) {
		let queue = this.#propchangeQueue.get(element);
		if (!queue) {
			queue = new Map();
			this.#propchangeQueue.set(element, queue);
		}
		let existing = queue.get(prop.name);
		if (existing) {
			// Coalesce. Pin oldValue (and oldAttributeValue, if any) to the
			// first-seen pre-write value so the dispatched payload spans the
			// full first→last delta.
			let { oldValue, oldAttributeValue } = existing.detail;
			existing.detail = { ...change, oldValue };
			if (oldAttributeValue !== undefined) {
				existing.detail.oldAttributeValue = oldAttributeValue;
			}
		}
		else {
			queue.set(prop.name, { name: prop.name, prop, detail: { ...change } });
		}

		let map = this.#pendingChangedProps.get(element);
		if (!map) {
			map = new Map();
			this.#pendingChangedProps.set(element, map);
		}
		if (!map.has(prop.name)) {
			map.set(prop.name, change.oldValue);
		}
		this.#pendingPropschangeElements.add(element);
		this.#schedulePropschange();
	}

	/**
	 * Synchronously dispatch this element's queued `propchange` events.
	 * Loops until the queue is empty so re-entrant writes from handlers
	 * surface in the same drain. Nested calls *on the same element* are
	 * no-ops. Paused elements skip entirely — `resume` will dispatch later.
	 */
	drain (element) {
		if (this.#draining.has(element) || this.#paused.has(element)) {
			return;
		}

		this.#draining.add(element);
		try {
			while (this.#propchangeQueue.has(element)) {
				this.#dispatchPropchanges(element);
			}
		}
		finally {
			this.#draining.delete(element);
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

		for (let payload of queue.values()) {
			let { prop, detail } = payload;
			// Skip net no-ops — only possible when coalescing collapsed a
			// round-trip back to the first-seen value (e.g. while paused).
			if (prop.equals(detail.value, detail.oldValue)) {
				continue;
			}
			// EventTarget isolates listener throws — siblings stay safe without try/catch.
			for (let name of ["propchange", ...(prop.eventNames ?? [])]) {
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
		if (this.#paused.has(element)) {
			// Leave the accumulator intact. Don't re-add to pending — that
			// would pin a strong reference to a detached element.
			// `resume()` checks `#pendingChangedProps` directly.
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

	/**
	 * Hold propchange/propschange dispatch for this element. Writes still
	 * land (signals update, Computeds recompute, reads stay consistent),
	 * but events coalesce into the per-element queue and accumulator
	 * instead of firing. Resume drains both as one settled snapshot.
	 */
	pause (element) {
		this.#paused.add(element);
	}

	/**
	 * Resume change monitoring and drain anything that accumulated while
	 * paused: one coalesced propchange per changed prop, then the
	 * propschange summary.
	 */
	resume (element) {
		this.#paused.delete(element);
		this.drain(element);
		if (this.#pendingChangedProps.has(element)) {
			this.#pendingPropschangeElements.delete(element);
			this.#dispatchPropschangeFor(element);
		}
	}

	connected (element) {
		this.resume(element);
	}

	disconnected (element) {
		this.pause(element);
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
		this.drain(element);
		this.#dispatchPropschangeFor(element);
	}
}

import { symbols } from "xtensible";
import ElementProp from "./ElementProp.js";
import PropChangeEvent from "./PropChangeEvent.js";
import PropsChangeEvent from "./PropsChangeEvent.js";

const { props } = symbols.known;

/**
 * Per-element collection of {@link ElementProp} wrappers.
 */
export default class ElementProps extends Map {
	#paused = true;

	/**
	 * Whether propchange-style event dispatch is currently held. While `true`,
	 * fired events are coalesced per (eventName, propName) in the burst queue;
	 * flipping to `false` dispatches every undispatched event in queue order.
	 */
	get paused () {
		return this.#paused;
	}

	set paused (value) {
		value = Boolean(value);
		if (value === this.#paused) {
			return;
		}

		this.#paused = value;

		if (!value) {
			for (let event of this.#eventQueue.values()) {
				// Stale consumer view: oldValue ≠ value means we haven't told
				// the consumer about the current value yet.
				if (!event.prop.spec.equals(event.oldValue, event.value)) {
					this.element.dispatchEvent(event);
					// Rebase: consumer now knows about the current value.
					event.oldValue = event.value;
				}
			}

			// Drains scheduled while paused exited early without firing
			// propschange. Queue a fresh one so the bunched event still fires
			// after the resume flush settles.
			if (this.#eventQueue.size > 0) {
				queueMicrotask(() => this.#drain());
			}
		}
	}

	/** @type {Set<string>} Attributes mid-reflective-write; their ACB should be ignored. */
	ignoredAttributes = new Set();

	/**
	 * Coalesced `propchange` events keyed by prop name. Each entry is the
	 * event that would be dispatched right now for that prop: `oldValue` is
	 * what was last told to the consumer (or the burst-start value if never
	 * dispatched), `value` is the current stored value, and `firstOldValue`
	 * is the sticky burst-start value used by the `propschange` drain.
	 * `event.target` is non-null once the event has been dispatched at least once.
	 * @type {Map<string, PropChangeEvent>}
	 */
	#eventQueue = new Map();

	/**
	 * Construct the per-element collection and run the mount-time init pass.
	 * Pre-mount user writes (`element.foo = …`) and pre-mount attribute writes
	 * (`setAttribute`) leave traces on the element itself — a shadowing data
	 * property and an attribute, respectively — which each {@link ElementProp}'s
	 * init pass picks up. So there's no separate `initialize()` step: the
	 * constructor allocates every wrapper and then runs init on each.
	 *
	 * The split is internal (allocate-all → init-all) so cascades during init
	 * always find existing wrappers in the Map — a wrapper materialized
	 * mid-cascade would fire its own default event in addition to the
	 * cascading update.
	 *
	 * @param {HTMLElement} element The element this collection belongs to.
	 */
	constructor (element) {
		super();
		this.element = element;

		// Install on the element first, so mount-time events and computed
		// getters fired during init can resolve other props through the
		// accessor (which routes via `element.props`).
		element.props = this;

		// Materialize an ElementProp for every spec. Each constructor
		// self-registers and runs its own init (shadow / attr / default-fire),
		// cascading to dependents via {@link get} if needed — so wrappers
		// that get created mid-cascade end up in the Map before this loop
		// reaches them.
		for (let name of this.spec.keys()) {
			this.get(name);
		}

		this.paused = false;
	}

	/**
	 * @returns {Props} The class-level prop spec collection.
	 */
	get spec () {
		return this.element.constructor[props];
	}

	/**
	 * Get the {@link ElementProp} wrapper for a prop by name, creating it on
	 * demand from this element's own class-level {@link Props}.
	 * @param {string} name
	 * @returns {ElementProp | undefined}
	 */
	get (name) {
		let ep = super.get(name);
		if (ep) {
			return ep;
		}

		let spec = this.spec.get(name);
		if (spec) {
			// ElementProp self-registers in our Map.
			return new ElementProp(this, spec);
		}

		return undefined;
	}

	/**
	 * Propagate an observed attribute change to every prop reflected from it.
	 * @param {string} name Attribute name.
	 * @param {string | null} [oldValue]
	 */
	attributeChanged (name, oldValue) {
		if (this.ignoredAttributes.has(name)) {
			return;
		}

		for (let [propName, spec] of this.spec) {
			if (spec.reflect.from === name) {
				this.get(propName).set(this.element.getAttribute(name), {
					source: "attribute",
					name,
					oldAttributeValue: oldValue,
				});
			}
		}
	}

	/**
	 * Fire a `propchange` event for `ep` and cascade updates to any dependents.
	 *
	 * The event is coalesced into the burst queue keyed by prop name: a
	 * queued entry has its `value` updated and is moved to the end of
	 * insertion order; otherwise a fresh event is created. When unpaused,
	 * the event is dispatched synchronously and its `oldValue` rebases to
	 * what the consumer was just told. The queue only retains entries with
	 * work left — net-zero entries (nothing to tell the consumer AND no net
	 * delta for the `propschange` drain) are dropped.
	 *
	 * @param {ElementProp} ep The prop that changed.
	 * @param {Object} change Change descriptor (see {@link ElementProp#set}).
	 */
	propChanged (ep, change) {
		// Source-first: fire before cascading so listeners hear the written prop first.
		let key = ep.name;
		let event = this.#eventQueue.get(key);

		if (event) {
			// Coalesce: keep firstOldValue + oldValue (last-told), update value.
			event.value = change.value;
			// delete + set moves the entry to the end of insertion order.
			this.#eventQueue.delete(key);
		}
		else {
			event = new PropChangeEvent("propchange", { name: ep.name, prop: ep, ...change });
		}

		if (!this.#paused) {
			this.element.dispatchEvent(event);
			// Rebase: consumer now knows about the current value.
			event.oldValue = event.value;
		}

		// Keep only if there's work left: something still to tell the consumer,
		// OR a non-zero net effect for the `propschange` drain. If the consumer
		// was told an intermediate value, the entry stays so resume can dispatch
		// the revert (propschange still skips it — #drain filters by firstOldValue).
		let { spec } = ep;
		if (
			!spec.equals(event.oldValue, event.value)
			|| !spec.equals(event.value, event.firstOldValue)
		) {
			this.#eventQueue.set(key, event);
			queueMicrotask(() => this.#drain());
		}

		// Update all props that depend on this one. {@link get} materializes a
		// dependent that hasn't been wrapped yet (e.g. during the constructor's
		// initial iteration) on demand.
		let dependentSpecs = this.spec.dependents[ep.name] ?? [];
		for (let depSpec of dependentSpecs) {
			let dep = this.get(depSpec.name);
			if (dep.dependsOn(ep)) {
				dep.update(ep);
			}
		}
	}

	/**
	 * Build the net change map from the burst queue and fire `propschange`.
	 * No-op while paused or after another drain already cleared the queue —
	 * the {@link paused} setter queues a fresh drain on resume.
	 */
	#drain () {
		if (this.#paused) {
			return;
		}

		let changed = new Map();
		for (let event of this.#eventQueue.values()) {
			// Net-zero entries are dropped — they only exist so resume could
			// dispatch a revert to the consumer.
			if (!event.prop.spec.equals(event.value, event.firstOldValue)) {
				changed.set(event.name, event.firstOldValue);
			}
		}
		this.#eventQueue.clear();

		if (changed.size > 0) {
			this.element.dispatchEvent(new PropsChangeEvent("propschange", { changed }));
		}
	}
}

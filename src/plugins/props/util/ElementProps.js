import { symbols } from "xtensible";
import ElementProp from "./ElementProp.js";
import PropChangeEvent from "./PropChangeEvent.js";

const { props } = symbols.known;

/**
 * Per-element collection of {@link ElementProp} wrappers.
 */
export default class ElementProps extends Map {
	#paused = true;

	/**
	 * Whether `propchange` dispatch is currently held. While `true`, writes
	 * append to the burst queue without dispatching; flipping to `false`
	 * sequentially coalesces undispatched runs (same prop in a row) and
	 * dispatches one event per run.
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
			this.#flushPending();
		}
	}

	/** @type {Set<string>} Attributes mid-reflective-write; their ACB should be ignored. */
	ignoredAttributes = new Set();

	/**
	 * Paused-pending `propchange` events in write order. Empty during
	 * unpaused operation — live writes go straight through
	 * {@link #firePropChangeEvent}.
	 * @type {PropChangeEvent[]}
	 */
	#eventQueue = [];

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
	 * Either dispatch a `propchange` synchronously or queue it for resume,
	 * then cascade updates to any dependents.
	 * @param {ElementProp} ep The prop that changed.
	 * @param {Object} change Change descriptor (see {@link ElementProp#set}).
	 */
	propChanged (ep, change) {
		// Source-first: fire before cascading so listeners hear the written prop first.
		let event = new PropChangeEvent("propchange", { name: ep.name, prop: ep, ...change });

		if (this.#paused) {
			this.#eventQueue.push(event);
		}
		else {
			this.#firePropChangeEvent(event);
		}

		// Update all props that depend on this one. {@link get} materializes a
		// dependent that hasn't been wrapped yet (e.g. during the constructor's
		// initial iteration) on demand.
		let dependentSpecs = this.spec.dependents[ep.name] ?? [];
		for (let depSpec of dependentSpecs) {
			let dep = this.get(depSpec.name);
			if (dep.dependsOn(ep)) {
				dep.update();
			}
		}
	}

	/**
	 * Dispatch a single `propchange` event. Skips no-op events
	 * (oldValue === value), which only arise as the result of coalescing
	 * a paused round-trip; live writes are already filtered upstream by
	 * {@link ElementProp#set}.
	 *
	 * @param {PropChangeEvent} event
	 */
	#firePropChangeEvent (event) {
		if (event.prop.spec.equals(event.oldValue, event.value)) {
			return;
		}

		this.element.dispatchEvent(event);
	}

	/**
	 * Walk the paused queue in write order, in-place coalescing consecutive
	 * same-prop events (a run like `A A B A` keeps three entries, not two),
	 * then dispatch each surviving entry. Called synchronously from the
	 * `paused` setter on resume.
	 */
	#flushPending () {
		// In-place coalesce consecutive same-prop entries: keep the last
		// event of each run (its fields describe the latest write), but
		// rewrite its oldValue to the run's burst-start value.
		let writeIdx = 0;
		let lastName = null;
		for (let event of this.#eventQueue) {
			if (event.name === lastName) {
				let prev = this.#eventQueue[writeIdx - 1];
				event.oldValue = prev.oldValue;
				this.#eventQueue[writeIdx - 1] = event;
			}
			else {
				this.#eventQueue[writeIdx++] = event;
				lastName = event.name;
			}
		}
		this.#eventQueue.length = writeIdx;

		// Dispatch the coalesced events. Detach first so listener-induced
		// writes during dispatch don't get re-coalesced into this pass.
		let queue = this.#eventQueue;
		this.#eventQueue = [];
		for (let event of queue) {
			this.#firePropChangeEvent(event);
		}
	}
}

import { symbols } from "xtensible";
import ElementProp from "./ElementProp.js";
import PropChangeEvent from "./PropChangeEvent.js";

const { props } = symbols.known;

/**
 * Per-element collection of {@link ElementProp} wrappers.
 * Owns per-element state: stored values, paused/queued events, and attribute
 * echo suppression.
 */
export default class ElementProps extends Map {
	#paused = true;

	/**
	 * Attributes currently being written reflexively by an {@link ElementProp};
	 * the resulting attributeChangedCallback should be ignored.
	 * @type {Set<string>}
	 */
	ignoredAttributes = new Set();

	/**
	 * Queue of propchange-style events awaiting dispatch while paused.
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

		this.resumeEvents();
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
	 * Fire propchange events for `ep` and cascade updates to any dependents.
	 * @param {ElementProp} ep The prop that changed.
	 * @param {Object} change Change descriptor (see {@link ElementProp#set}).
	 */
	propChanged (ep, change) {
		// Source-first: fire before cascading so listeners hear the written prop first.
		let eventNames = ["propchange", ...(ep.spec.eventNames ?? [])];
		for (let eventName of eventNames) {
			this.#firePropChangeEvent(eventName, {
				name: ep.name,
				prop: ep,
				detail: change,
			});
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
	 * Hold propchange event dispatch; events fired in the meantime are queued.
	 */
	pauseEvents () {
		this.#paused = true;
	}

	/**
	 * Resume propchange event dispatch and flush any queued events.
	 */
	resumeEvents () {
		this.#paused = false;

		let queue = this.#eventQueue;
		this.#eventQueue = [];
		for (let event of queue) {
			this.element.dispatchEvent(event);
		}
	}

	/**
	 * Dispatch (or queue, if paused) a propchange-style event.
	 * @param {string} eventName
	 * @param {{name: string, prop: ElementProp, detail: Object}} eventProps
	 */
	#firePropChangeEvent (eventName, eventProps) {
		let event = new PropChangeEvent(eventName, eventProps);

		if (this.#paused) {
			this.#eventQueue.push(event);
		}
		else {
			this.element.dispatchEvent(event);
		}
	}
}

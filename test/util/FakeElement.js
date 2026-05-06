import Props from "../../src/plugins/props/util/Props.js";

/** Yield N microtasks so any queued work runs. */
export async function flush (ticks = 1) {
	for (let i = 0; i < ticks; i++) {
		await Promise.resolve();
	}
}

/** Apply each action to el in sequence, flushing between each. Single function is fine too. */
export async function apply (el, actions, ticks = 1) {
	actions = Array.isArray(actions) ? actions : [actions];

	for (let action of actions) {
		action(el);
		await flush(ticks);
	}
}

/** Minimal in-memory element for tests of Prop / Props. */
export default class FakeElement extends EventTarget {
	ignoredAttributes = new Set();
	props = {};
	#attrs = new Map();

	constructor () {
		super();
		// Stand in for the plugin's `constructor` hook auto-wiring.
		if (this.propChangedCallback) {
			this.addEventListener("propchange", this.propChangedCallback);
		}
		if (this.updated) {
			this.addEventListener("propschange", this.updated);
		}
	}

	#connected = false;
	get isConnected () {
		return this.#connected;
	}

	set isConnected (value) {
		let was = this.#connected;
		this.#connected = value;
		// Stand in for the real `connectedCallback`.
		if (!was && value) {
			this.constructor.props?.connected(this);
		}
	}

	hasAttribute (name) {
		return this.#attrs.has(name);
	}

	getAttribute (name) {
		return this.#attrs.get(name) ?? null;
	}

	setAttribute (name, value) {
		let oldValue = this.#attrs.get(name) ?? null;
		this.#attrs.set(name, String(value));
		this.constructor.props?.attributeChanged(this, name, oldValue);
	}

	removeAttribute (name) {
		let oldValue = this.#attrs.get(name) ?? null;
		this.#attrs.delete(name);
		this.constructor.props?.attributeChanged(this, name, oldValue);
	}

	mount () {
		this.isConnected = true;
		this.constructor.props.initializeFor(this);
	}

	/**
	 * Subscribe a listener that records every `propchange` event on this element.
	 * Returns the live array of `{ name, source, value }` records.
	 */
	recordEvents () {
		let events = [];
		this.addEventListener("propchange", e => {
			events.push({ name: e.name, source: e.detail?.source, value: this[e.name] });
		});
		return events;
	}

	/** Build a FakeElement subclass with the given props spec. */
	static with (props) {
		let Class = class extends FakeElement {};
		Class.props = new Props(Class, props);
		return Class;
	}

	/**
	 * Build a FakeElement subclass for `props`, instantiate it, attach the
	 * propchange recorder, mount it, run each action thunk with a microtask
	 * flush between calls (so Computed-backed recomputations land in order),
	 * and return `{ Class, el, events }`. `Class` lets callers spin up extra
	 * instances when a test needs pre-mount setup.
	 */
	static async from (props, actions = []) {
		let Class = FakeElement.with(props);
		let el = new Class();
		let events = el.recordEvents();
		el.mount();

		for (let action of actions) {
			action(el);
			await flush();
		}

		return { Class, el, events };
	}
}

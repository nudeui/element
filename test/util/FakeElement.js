import Props from "../../src/plugins/props/util/Props.js";

/** Minimal in-memory element for tests of Prop / Props. */
export default class FakeElement extends EventTarget {
	isConnected = false;
	ignoredAttributes = new Set();
	props = {};
	#attrs = new Map();

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

	/**
	 * Build a FakeElement subclass for `props`, instantiate it, attach the
	 * propchange recorder, mount it, run each action thunk with a microtask
	 * flush between calls (so Computed-backed recomputations land in order),
	 * and return `{ Class, el, events }`. `Class` lets callers spin up extra
	 * instances when a test needs pre-mount setup.
	 */
	static async from (props, actions = []) {
		let Class = class extends FakeElement {};
		Class.props = new Props(Class, props);

		let el = new Class();
		let events = el.recordEvents();
		el.mount();

		for (let action of actions) {
			action(el);
			await Promise.resolve();
		}

		return { Class, el, events };
	}
}

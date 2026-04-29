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

	#connected = false;
	get isConnected () {
		return this.#connected;
	}

	set isConnected (value) {
		let was = this.#connected;
		this.#connected = value;
		// Stand in for the real `connectedCallback`.
		if (!was && value) {
			this.constructor.props?.connected?.(this);
		}
	}

	hasAttribute (name) {
		return this.#attrs.has(name);
	}

	getAttribute (name) {
		return this.#attrs.get(name) ?? null;
	}

	setAttribute (name, value) {
		let old = this.#attrs.get(name) ?? null;
		let str = String(value);
		if (old === str) {
			return;
		}

		this.#attrs.set(name, str);
		// Stand in for the real `attributeChangedCallback`.
		if (this.#connected) {
			this.constructor.props?.attributeChanged?.(this, name, old);
		}
	}

	removeAttribute (name) {
		let old = this.#attrs.get(name) ?? null;
		if (old === null) {
			return;
		}

		this.#attrs.delete(name);
		if (this.#connected) {
			this.constructor.props?.attributeChanged?.(this, name, old);
		}
	}

	mount () {
		this.isConnected = true;
		this.constructor.props.initializeFor(this);
	}

	/** Build a FakeElement subclass with the given props spec. */
	static with (props) {
		let Class = class extends FakeElement {};
		Class.props = new Props(Class, props);
		return Class;
	}
}

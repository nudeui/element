import { addPlugins, symbols } from "xtensible";
import Props from "../../src/plugins/props/util/Props.js";

/** Same Symbol the props plugin uses for its per-class slot — get-symbols' shared registry. */
const { props: propsSymbol } = symbols.known;

/** Yield N microtasks so any queued work runs. */
export async function flush (ticks = 1) {
	for (let i = 0; i < ticks; i++) {
		await Promise.resolve();
	}
}

/** Apply each action to element in sequence, flushing between each. Single function is fine too. */
export async function apply (element, actions, ticks = 1) {
	actions = Array.isArray(actions) ? actions : [actions];

	for (let action of actions) {
		action(element);
		await flush(ticks);
	}
}

/**
 * Per-class observedAttributes captured at FakeElement.with() time, like
 * customElements.define reads them once in the browser.
 *
 * With plugins, read via the plugin's static getter (the customElements.define
 * path); otherwise via the Props instance.
 *
 * setAttribute / removeAttribute consult this to decide whether to fire
 * attributeChanged.
 */
const defined = new WeakMap();

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
		if (defined.get(this.constructor)?.includes(name)) {
			this.constructor.props?.attributeChanged(this, name, oldValue);
		}
	}

	removeAttribute (name) {
		let oldValue = this.#attrs.get(name) ?? null;
		this.#attrs.delete(name);
		if (defined.get(this.constructor)?.includes(name)) {
			this.constructor.props?.attributeChanged(this, name, oldValue);
		}
	}

	mount () {
		this.isConnected = true;
		this.constructor.props.initializeFor(this);
	}

	/** Build a FakeElement subclass with the given props spec and plugins. */
	static with (props, ...plugins) {
		let Class = class extends FakeElement {};
		Class.props = new Props(Class, props);

		if (plugins.length) {
			addPlugins(Class, ...plugins);
			Class[propsSymbol] = Class.props;
		}

		defined.set(
			Class,
			plugins.length ? Class.observedAttributes : Class.props.observedAttributes,
		);

		return Class;
	}
}

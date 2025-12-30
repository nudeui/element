/**
 * Extensible MutationObserver class
 */

import extensible, { addPlugin } from "../extensible.js";
import { registry as symbolRegistry } from "../symbols.js";
import IterableWeakMap from "./util/iterable-weakmap.js";

export const symbols = symbolRegistry();
export const { callback, invoke, refresh } = symbols;

export default class MutationObserver2 extends MutationObserver {
	/** @type {WeakMap<Node, MutationObserverInit>} */
	observations = new IterableWeakMap();

	static {
		addPlugin(this, extensible);
	}

	constructor (callback) {
		super(new.target.callback);
		Object.defineProperty(this, "callback", { value: callback });
		this.$hook("constructor");
	}

	observe (target, options = {}) {
		let env = { target, options };

		this.$hook("observe", env);
		this.observations.set(env.target, env.options);

		super.observe(env.target, env.options);
	}

	disconnect () {
		this.$hook("disconnect");
		super.disconnect();
		this.observations.clear();
	}

	static symbols = symbols;

	static callback (records, that) {
		let env = { records };
		that.$hook("callback", env);
		return that.callback(env.records, that);
	}
}

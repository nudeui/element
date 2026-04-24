/**
 * Extensible MutationObserver class
 */

import { addPlugin, symbols as getSymbols } from "xtensible";
import { $hook } from "xtensible/plugins";
import IterableWeakMap from "./util/iterable-weakmap.js";

export const symbols = getSymbols.registry();
export const { callback, invoke, refresh } = symbols;

export default class MutationObserver2 extends MutationObserver {
	/** @type {WeakMap<Node, MutationObserverInit>} */
	observations = new IterableWeakMap();

	static {
		addPlugin(this, $hook);
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

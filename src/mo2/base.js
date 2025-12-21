/**
 * Extensible MutationObserver class
 */

import makeExtensible from "../plugins/extensible.js";
import { registry as symbolRegistry } from "../plugins/symbols.js";
import IterableWeakMap from "./util/iterable-weakmap.js";

export const symbols = symbolRegistry();
export const {
	callback,
	invoke,
	refresh,
} = symbols;

export default class MutationObserver2 extends MutationObserver {
	/** @type {WeakMap<Node, MutationObserverInit>} */
	observations = new IterableWeakMap();

	static {
		makeExtensible(this);
	}

	constructor (callback) {
		super(new.target.callback);
		Object.defineProperty(this, "callback", { value: callback });
		this.constructor.hooks.run("constructor", { context: this });
	}

	observe (target, options = {}) {
		let env = { context: this, target, options };

		this.constructor.hooks.run("observe", env);
		this.observations.set(env.target, env.options);

		super.observe(env.target, env.options);
	}

	disconnect () {
		let env = { context: this };
		this.constructor.hooks.run("disconnect", env);
		super.disconnect();
		this.observations.clear();
	}

	static symbols = symbols;

	static callback (records, that) {
		let env = { context: that, records };
		that.constructor.hooks.run("callback", env);
		return that.callback(env.records, that);
	}
}


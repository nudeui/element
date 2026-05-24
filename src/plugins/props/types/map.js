import PropType from "../util/PropType.js";
import Iterable from "./iterable.js";

const entrySplitter = /(?<!\\):/;

/**
 * Concrete type for `Map`, which also serves as the canonical dictionary in
 * JS. Extends {@link Iterable}: reuses the parent's `parseItems` to grab
 * raw string parts, then splits each on `:` in {@link parseEntries} to yield
 * raw `[key, value]` tuples (already-tuple input flows through unchanged).
 * {@link parse} applies `this.keys` / `this.values` to each entry and
 * materializes into a `Map`. `Object` is registered as a derivative
 * (`extends: MapType`) since it's a constrained realization of the same
 * concept — the streaming parseEntries pipeline is shared via the prototype
 * chain.
 */
const MapType = PropType.register({
	is: Map,
	extends: Iterable,
	subTypes: ["keys", "values"],

	/**
	 * Yield raw `[key, value]` entries. Strings coming from {@link parseItems}
	 * are split once on `:` (escaped `\:` preserved); shorthand entries with
	 * no colon get filled in via `spec.defaultKey` or `spec.defaultValue`
	 * (default `true`); the literal `"false"` becomes the boolean `false`.
	 * Non-string items (e.g. an already-iterable of tuples) flow through
	 * unchanged. No `keys.parse` / `values.parse` applied — that's
	 * {@link parse}'s job.
	 * @this {PropType}
	 * @param {string | Iterable<[unknown, unknown]> | unknown} value
	 * @returns {Iterator<[unknown, unknown]>}
	 */
	*parseEntries (value) {
		let { defaultKey, defaultValue = true } = this.spec;
		let index = 0;
		for (let item of this.parseItems(value)) {
			let k, v;
			if (typeof item === "string") {
				let parts = item.split(entrySplitter);
				if (parts.length >= 2) {
					k = parts.shift();
					v = parts.join(":");
				}
				else if (defaultKey !== undefined) {
					v = parts[0];
					k = typeof defaultKey === "function" ? defaultKey(v, index) : defaultKey;
				}
				else {
					k = parts[0];
					v = typeof defaultValue === "function" ? defaultValue(k, index) : defaultValue;
				}
				k = k?.trim?.() ?? k;
				v = v?.trim?.() ?? v;
				if (v === "false") {
					v = false;
				}
			}
			else {
				[k, v] = item;
			}

			yield [k, v];
			index++;
		}
	},

	/**
	 * Yield each `[k, v]` from {@link parseEntries} with `this.keys` and
	 * `this.values` applied to the respective halves. The intermediate
	 * generator that concrete types (Object, …) consume into their own
	 * container.
	 *
	 * @todo Inline into {@link parse} via
	 *   `this.parseEntries(value).map(([k, v]) => [this.keys.parse(k), this.values.parse(v)])`
	 *   once `Iterator.prototype.map` is reliably available (Baseline 2025).
	 *
	 * @this {PropType}
	 * @param {string | Iterable<[unknown, unknown]>} value
	 * @returns {Iterator<[unknown, unknown]>}
	 */
	*parsedEntries (value) {
		for (let [k, v] of this.parseEntries(value)) {
			yield [this.keys.parse(k), this.values.parse(v)];
		}
	},

	/**
	 * Materialize {@link parsedEntries} into a `Map`. ObjectType overrides
	 * to wrap via `Object.fromEntries`.
	 * @this {PropType}
	 * @param {string | Iterable<[unknown, unknown]> | object} value
	 * @returns {Map<unknown, unknown>}
	 */
	parse (value) {
		if (value && typeof value === "object" && !value[Symbol.iterator]) {
			value = Object.entries(value);
		}
		return new this.is(this.parsedEntries(value));
	},

	/**
	 * Stringify an iterable of `[key, value]` entries into `"k: v, k: v"`.
	 * Each half passes through `this.keys` / `this.values`; entries are
	 * joined by `spec.separator` (default `", "`).
	 * @this {PropType}
	 * @param {Iterable<[unknown, unknown]>} value
	 * @returns {string}
	 */
	stringify (value) {
		let { separator = ", " } = this.spec;
		let parts = [];
		for (let [k, v] of value) {
			parts.push(`${this.keys.stringify(k)}: ${this.values.stringify(v)}`);
		}
		return parts.join(separator);
	},

	/**
	 * Walk two iterables of `[key, value]` entries in parallel, comparing
	 * each pair via `this.keys.equals` and `this.values.equals`.
	 * @this {PropType}
	 * @param {Iterable<[unknown, unknown]>} a
	 * @param {Iterable<[unknown, unknown]>} b
	 * @returns {boolean}
	 */
	equals (a, b) {
		let aIter = a[Symbol.iterator]();
		let bIter = b[Symbol.iterator]();
		while (true) {
			let { value: aEntry, done: ad } = aIter.next();
			let { value: bEntry, done: bd } = bIter.next();
			if (ad !== bd) {
				return false;
			}
			if (ad) {
				return true;
			}
			let [ak, av] = aEntry;
			let [bk, bv] = bEntry;
			if (!this.keys.equals(ak, bk) || !this.values.equals(av, bv)) {
				return false;
			}
		}
	},
});

export default MapType;

/**
 * @typedef {import("../util/PropType.js").SpecifiedType} SpecifiedType
 * @typedef {import("../util/PropType.js").PropTypeSpec} PropTypeSpec
 */

/**
 * @typedef {PropTypeSpec & {
 *   keys?: SpecifiedType,
 *   values?: SpecifiedType,
 *   separator?: string,
 *   defaultKey?: ((value: unknown, index: number) => unknown) | unknown,
 *   defaultValue?: ((key: unknown, index: number) => unknown) | unknown,
 *   pairs?: object,
 * }} MapTypeSpec
 */

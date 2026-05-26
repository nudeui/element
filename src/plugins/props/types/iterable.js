import PropType from "../util/PropType.js";
import { split } from "../util/split.js";

/**
 * Abstract type for any iterable. The parsing pipeline is two streaming
 * generators feeding a terminal step: {@link parseItems} yields raw items
 * (no type parsing); {@link parsedItems} yields each item through
 * `this.values`; {@link parse} materializes into an `Array`. Concrete
 * types (Array, Set, …) `extends: Iterable` — Array inherits `parse`
 * unchanged; Set overrides `parse` to wrap `this.parsedItems(value)` into
 * a `Set`. Each input value flows through the chain exactly once.
 *
 * `MapType` extends this and reuses `parseItems` to grab the raw string
 * parts, then splits each on `:` in its own `parseEntries` to yield
 * `[key, value]` tuples.
 */
const Iterable = PropType.register({
	name: "Iterable",
	subTypes: ["values"],

	/**
	 * Yield raw items of `value` — strings get split via {@link split},
	 * iterables are consumed verbatim, scalars are yielded once. No
	 * `values.parse` is applied; this is the splitter, not the typer.
	 * @this {PropType}
	 * @param {string | Iterable<unknown> | unknown} value
	 * @returns {Iterator<unknown>}
	 */
	*parseItems (value) {
		if (typeof value === "string") {
			yield* split(value, this.spec);
		}
		else if (value?.[Symbol.iterator]) {
			yield* value;
		}
		else {
			yield value;
		}
	},

	/**
	 * Yield each item from {@link parseItems} through `this.values`.
	 * The intermediate generator that concrete types (Set, …) consume into
	 * their own container.
	 *
	 * @todo Inline into {@link parse} via
	 *   `this.parseItems(value).map(v => this.values.parse(v))` once
	 *   `Iterator.prototype.map` is reliably available (Baseline 2025).
	 *
	 * @this {PropType}
	 * @param {string | Iterable<unknown> | unknown} value
	 * @returns {Iterator<unknown>}
	 */
	*parsedItems (value) {
		for (let v of this.parseItems(value)) {
			yield this.values.parse(v);
		}
	},

	/**
	 * Materialize {@link parsedItems} into an `Array`. Inherited by ArrayType
	 * unchanged; SetType overrides to wrap into a `Set`.
	 * @this {PropType}
	 * @param {string | Iterable<unknown> | unknown} value
	 * @returns {unknown[]}
	 */
	parse (value) {
		return new this.is(this.parsedItems(value));
	},

	/**
	 * Stringify an iterable: each item passes through `this.values`, joined
	 * by `spec.joiner` (falling back to `spec.separator`, default `", "`).
	 * Whitespace is *not* added automatically — consumers who want spaces
	 * include them in the joiner (or separator) themselves.
	 * @this {PropType}
	 * @param {Iterable<unknown>} value
	 * @returns {string}
	 */
	stringify (value) {
		let { separator = ", ", joiner = separator } = this.spec;
		let parts = [];
		for (let v of value) {
			parts.push(this.values.stringify(v));
		}
		return parts.join(joiner);
	},

	/**
	 * Walk two iterables in parallel, comparing each pair via
	 * `this.values.equals`. Returns true iff both yield the same number
	 * of items and every pair compares equal.
	 * @this {PropType}
	 * @param {Iterable<unknown>} a
	 * @param {Iterable<unknown>} b
	 * @returns {boolean}
	 */
	equals (a, b) {
		let aIter = a[Symbol.iterator]();
		let bIter = b[Symbol.iterator]();
		while (true) {
			let { value: av, done: ad } = aIter.next();
			let { value: bv, done: bd } = bIter.next();
			if (ad !== bd) {
				return false;
			}
			if (ad) {
				return true;
			}
			if (!this.values.equals(av, bv)) {
				return false;
			}
		}
	},
});

export default Iterable;

/** @import { SpecifiedType, PropTypeSpec } from "../util/PropType.js" */

/**
 * @typedef {PropTypeSpec & {
 *   values?: SpecifiedType,
 *   separator?: string,
 *   joiner?: string,
 *   pairs?: object,
 * }} IterableSpec
 */

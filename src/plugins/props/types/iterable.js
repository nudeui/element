import PropType from "../util/PropType.js";
import { split } from "../util/split.js";

/**
 * Abstract type for any iterable. The parsing pipeline is two streaming
 * generators: {@link parseItems} yields raw items (no type parsing), and
 * {@link parse} yields each item through `this.values`. Concrete types
 * (Array, Set, …) `extends: IterableType` and pipe the {@link parse}
 * iterator straight into their own container — every input flows through
 * the chain exactly once, no intermediate arrays.
 *
 * `MapType` extends this and reuses `parseItems` to grab the raw string
 * parts, then splits each on `:` in its own `parseEntries` to yield
 * `[key, value]` tuples. Distinct names because the return types differ.
 */
const IterableType = PropType.register({
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
	 * @this {PropType}
	 * @param {string | Iterable<unknown> | unknown} value
	 * @returns {Iterator<unknown>}
	 */
	*parse (value) {
		for (let v of this.parseItems(value)) {
			yield this.values.parse(v);
		}
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

export default IterableType;

/**
 * @typedef {import("../util/PropType.js").SpecifiedType} SpecifiedType
 * @typedef {import("../util/PropType.js").PropTypeSpec} PropTypeSpec
 */

/**
 * @typedef {PropTypeSpec & {
 *   values?: SpecifiedType,
 *   separator?: string,
 *   joiner?: string,
 *   pairs?: object,
 * }} IterableTypeSpec
 */

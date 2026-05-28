/**
 * @typedef {object} PropChangeEventProps
 * @property {string} name Prop name.
 * @property {import("./ElementProp.js").default} prop
 * @property {*} value Current stored value (parsed + converted).
 * @property {*} oldValue Stored value before this change, or — for a coalesced
 *   resume dispatch — the burst-start value the consumer was last told.
 * @property {"property" | "attribute" | undefined} source Origin label for
 *   the most recent user write — `"property"`, `"attribute"`, or `undefined`
 *   if no write has ever landed. Persists across dep-cascade recomputes
 *   *and* across attribute removal: source describes the origin shape of the
 *   prop's input, not whether input is currently present. A `source:
 *   "property"` event can therefore mean either "user just wrote" or "user
 *   wrote previously, and a cascade just recomputed the visible value" —
 *   diff `value` vs `oldValue` if you need to tell them apart. Plugins may
 *   introduce additional source values; the built-in code only emits the
 *   three above.
 * @property {string} [attributeName] Set when `source === "attribute"` or a
 *   property write reflects to an attribute.
 * @property {string | null} [attributeValue]
 * @property {string | null} [oldAttributeValue]
 *
 * @typedef {EventInit & PropChangeEventProps} PropChangeEventInit
 */

/**
 * Per-prop change event. Fires synchronously inside a property/attribute
 * write, or on resume from a paused burst (sequentially coalesced). Fields
 * are direct properties — no `detail` wrapper. Each dispatch gets a fresh
 * event object; fields don't mutate past the handler.
 *
 * @implements {PropChangeEventProps}
 */
export default class PropChangeEvent extends Event {
	/**
	 * @param {string} type
	 * @param {PropChangeEventInit} options
	 */
	constructor (type, options = {}) {
		// Event picks out its init-dict keys (bubbles, cancelable, composed)
		// and silently ignores the rest.
		super(type, options);

		// Assign the rest as own properties, skipping anything Event already
		// owns (init dict, state like `target`/`defaultPrevented`, methods).
		for (let [key, value] of Object.entries(options)) {
			if (!(key in Event.prototype)) {
				this[key] = value;
			}
		}
	}

	/**
	 * Replay this change on a different element. Used to mirror a prop's
	 * value onto a sub-element from a `propchange` listener.
	 *
	 * Only events whose `source` is `"property"` or `"attribute"` (i.e. a user
	 * write) are mirrored — cascade-driven changes carry `source: undefined`
	 * and are intentionally not replicated, since the target should be reached
	 * by its own cascade if it shares the same dep graph.
	 *
	 * @param {Element} target Element to apply the change to.
	 */
	applyTo (target) {
		if (this.source === "attribute") {
			if (this.attributeValue === null) {
				target.removeAttribute(this.attributeName);
			}
			else {
				target.setAttribute(this.attributeName, this.attributeValue);
			}
		}
		else {
			target[this.name] = this.value;
		}
	}
}

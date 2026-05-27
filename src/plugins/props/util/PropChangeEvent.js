/**
 * @typedef {object} PropChangeEventProps
 * @property {string} name Prop name.
 * @property {import("./ElementProp.js").default} prop
 * @property {*} value Current stored value (parsed + converted).
 * @property {*} oldValue Stored value before this change, or — for a coalesced
 *   resume dispatch — the burst-start value the consumer was last told.
 * @property {"default" | "property" | "attribute" | "get" | "convert"} source
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
		else if (this.source === "property") {
			target[this.name] = this.value;
		}
	}
}

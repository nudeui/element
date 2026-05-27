/**
 * @typedef {object} PropChangeEventProps
 * @property {string} name Prop name.
 * @property {import("./ElementProp.js").default} prop
 * @property {*} value Current stored value (parsed + converted).
 * @property {*} oldValue Value the consumer was last told about: the stored
 *   value before this change for a fresh dispatch, or the previously-dispatched
 *   value when the event is re-dispatched after a paused burst.
 * @property {"default" | "property" | "attribute" | "get" | "convert"} source
 * @property {string} [attributeName] Set when `source === "attribute"` or a
 *   property write reflects to an attribute.
 * @property {string | null} [attributeValue]
 * @property {string | null} [oldAttributeValue]
 * @property {*} [firstOldValue] Stored value before the first change in the
 *   current burst. Stays sticky across rebasing of `oldValue` so the matching
 *   `propschange` drain can compute the net first→last delta. Defaults to
 *   `oldValue` on construction.
 *
 * @typedef {EventInit & PropChangeEventProps} PropChangeEventInit
 */

/**
 * Per-prop change event. Fires synchronously inside a property/attribute
 * write, then again on resume after a paused burst settles. Fields are
 * direct properties — no `detail` wrapper.
 *
 * The same event object is reused across dispatches within a burst: `value`
 * tracks the latest stored value and `oldValue` rebases to whatever was last
 * dispatched, so listeners that stash the event will see those fields mutate
 * past their handler. Copy the fields if you need a snapshot.
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

		this.firstOldValue ??= this.oldValue;
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

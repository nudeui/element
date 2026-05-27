/**
 * Per-prop change event. Fires synchronously inside a property/attribute
 * write, then again on resume after a paused burst settles. Fields are
 * direct properties — no `detail` wrapper.
 *
 * The same event object is reused across dispatches within a burst: `value`
 * tracks the latest stored value and `oldValue` rebases to whatever was last
 * dispatched, so listeners that stash the event will see those fields mutate
 * past their handler. Copy the fields if you need a snapshot.
 */
export default class PropChangeEvent extends Event {
	/** @type {string} Prop name. */
	name;

	/** @type {import("./ElementProp.js").default} */
	prop;

	/** @type {*} Current stored value (parsed + converted). */
	value;

	/**
	 * Value the consumer was last told about: the stored value before this
	 * change for a fresh dispatch, or the previously-dispatched value when
	 * the event is re-dispatched after a paused burst.
	 * @type {*}
	 */
	oldValue;

	/** @type {"default" | "property" | "attribute" | "get" | "convert"} */
	source;

	/** @type {string | undefined} Set when `source === "attribute"` or a property write reflects to an attribute. */
	attributeName;

	/** @type {string | null | undefined} */
	attributeValue;

	/** @type {string | null | undefined} */
	oldAttributeValue;

	/**
	 * Stored value before the first change in the current burst. Stays sticky
	 * across rebasing of {@link oldValue} so the matching `propschange` drain
	 * can compute the net first→last delta.
	 * @type {*}
	 */
	firstOldValue;

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

import { getSuperMethod } from "xtensible/util";

const provides = {
	connectedCallback () {
		// super.connectedCallback()
		getSuperMethod(this, provides.connectedCallback)?.call(this);

		// If the element starts off connected, this will fire *before* the microtask
		this.$hook("constructed", undefined, { once: true });
		this.$hook("connected");
	},

	disconnectedCallback () {
		// super.disconnectedCallback()
		getSuperMethod(this, provides.disconnectedCallback)?.call(this);

		this.$hook("disconnected");
	},

	// Must be on the prototype before customElements.define runs — spec reads observedAttributes only if ACB is non-null.
	attributeChangedCallback (name, oldValue, value) {
		// super.attributeChangedCallback()
		getSuperMethod(this, provides.attributeChangedCallback)?.call(this, name, oldValue, value);

		this.$hook("attribute-changed", { name, oldValue, value });
	},
};

export default { provides };

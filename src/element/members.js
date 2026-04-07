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
};

export default { provides };

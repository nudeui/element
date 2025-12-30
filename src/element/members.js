import { getSuperMethod } from "../util/super.js";

const provides = {
	// Called by the constructor
	constructed () {
		// super.constructed()
		getSuperMethod(this, provides.constructed)?.call(this);

		this.constructor.setup(); // Last resort
		this.constructor.$hook("constructor-static");
		this.$hook("constructor");

		// We use a microtask so that this executes after the subclass constructor has run as well
		Promise.resolve().then(() => {
			if (!this.constructor.hooks.hasRun("constructed")) {
				this.$hook("constructed");
			}
		});
	},

	connectedCallback () {
		// super.connectedCallback()
		getSuperMethod(this, provides.connectedCallback)?.call(this);

		if (!this.constructor.hooks.hasRun("constructed")) {
			// If the element starts off connected, this will fire *before* the microtask
			this.$hook("constructed");
		}

		this.$hook("connected");
	},

	disconnectedCallback () {
		// super.disconnectedCallback()
		getSuperMethod(this, provides.disconnectedCallback)?.call(this);

		this.$hook("disconnected");
	},
};

export default { provides };

import { getSuperMethod } from "../util/super.js";

const provides = {
	// Called by the constructor
	constructed () {
		// super.constructed()
		getSuperMethod(this, provides.constructed)?.call(this);

		this.constructor.setup(); // Last resort
		this.constructor.hooks.run("constructor-static", this.constructor);
		this.constructor.hooks.run("constructor", this);

		// We use a microtask so that this executes after the subclass constructor has run as well
		Promise.resolve().then(() => {
			if (!this.constructor.hooks.hasRun("constructed")) {
				this.constructor.hooks.run("constructed", this);
			}
		});
	},

	connectedCallback () {
		// super.connectedCallback()
		getSuperMethod(this, provides.connectedCallback)?.call(this);

		if (!this.constructor.hooks.hasRun("constructed")) {
			// If the element starts off connected, this will fire *before* the microtask
			this.constructor.hooks.run("constructed", this);
		}

		this.constructor.hooks.run("connected", this);
	},

	disconnectedCallback () {
		// super.disconnectedCallback()
		getSuperMethod(this, provides.disconnectedCallback)?.call(this);

		this.constructor.hooks.run("disconnected", this);
	},
};

export default { provides };

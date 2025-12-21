export const provides = {
	constructed () {
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
		if (!this.constructor.hooks.hasRun("constructed")) {
			// If the element starts off connected, this will fire *before* the microtask
			this.constructor.hooks.run("constructed", this);
		}

		this.constructor.hooks.run("connected", this);
	},

	disconnectedCallback () {
		this.constructor.hooks.run("disconnected", this);
	},
};

export default { provides };

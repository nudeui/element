import symbols from "../../symbols.js";
export const { events } = symbols.known;

const hooks = {
	setup () {
		if (this.events) {
			this.defineEvents();
		}
	},
};

const providesStatic = {
	defineEvents (def = this.events) {
		this[events] ??= {};

		let env = { events: def };
		this.$hook("define-events", env);

		Object.assign(this[events], env.events);
	},
};

export default { hooks, providesStatic };

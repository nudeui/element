import { defineOwnProperty } from "../../extensible.js";
import symbols from "../../symbols.js";
export const { events } = symbols.known;

const hooks = {
	setup () {
		if (Object.hasOwn(this, "events")) {
			this.defineEvents();
		}
	},
};

const providesStatic = {
	defineEvents (def = this.events) {
		let env = { events: def, context: this };
		this.$hook("define-events", env);

		Object.assign(this[events], env.events);
	},
};

defineOwnProperty(providesStatic, events, () => ({}));

export default { hooks, providesStatic };

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
		if (!def) {
			return;
		}

		let env = { events: def, existing: this[events] };
		this.$hook("define-events", env);

		for (let name in def) {
			def[name] ??= {};
			let env = { name, existing: this[events][name], event: def[name] };
			this.$hook("define-event", env);
			this[events][env.name] = env.event;
		}

		this.$hook("define-events-end", env);
	},
};

defineOwnProperty(providesStatic, events, () => ({}));

export default { hooks, providesStatic };

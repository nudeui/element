
import symbols from "../plugins/symbols.js";
export const { events } = symbols.known;

export const hooks = {
	first_constructor_static () {
		if (this.events) {
			this.defineEvents();
		}
	},
};

export const providesStatic = {
	defineEvents (def = this[events] ?? this.events) {
		this[events] ??= {};
		Object.assign(this[events], def);

		this.hooks.run("define-events", {context: this, events: def});
	},
};

export default { hooks, providesStatic };

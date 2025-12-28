import Hooks from "../../../hooks.js";

export default class Slots {
	hooks = new Hooks();

	constructor (ElementClass, def) {
		this.ElementClass = ElementClass;
		this.def = def;
		this.hooks.run("constructed", this);
	}

	defineSlot (name, def = {}) {
		def = typeof def === "string" ? { name: def } : def;
		let env = { name, definition: def, oldDefinition: this[name] };
		this.ElementClass.hooks.run("define-slot", env);

		if (env.definition) {
			this[env.name] = env.definition;
		}

		return this[env.name];
	}

	/**
	 * Add new slot definitions
	 * @param {*} def
	 */
	define (def) {
		if (!def) {
			return;
		}

		if (Array.isArray(def)) {
			for (let slot of def) {
				this.defineSlot(slot.name, slot);
			}
		}
		else {
			for (let name in def) {
				this.defineSlot(name, def[name]);
			}
		}
	}
}

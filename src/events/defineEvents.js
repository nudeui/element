import defineProps from "../props/defineProps.js";
import propchange from "./propchange.js";
import onprops from "./onprops.js";
import retarget from "./retarget.js";

import symbols from "../util/symbols.js";
const { events } = symbols.known;

export const dependencies = [defineProps];

export function setup () {
	// TODO decouple these from core event functionality
	this.addPlugin(propchange);
	this.addPlugin(onprops);
	this.addPlugin(retarget);
}

export const membersStatic = {
	defineEvents (def = this[events] ?? this.events) {
		this[events] ??= {};
		Object.assign(this[events], def);

		this.hooks.run("define-events", {context: this, events: def});
	},
};

export default {dependencies, setup, membersStatic};

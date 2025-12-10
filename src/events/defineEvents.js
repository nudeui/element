import * as defineProps from "../props/defineProps.js";
import * as propchange from "./propchange.js";
import * as onprops from "./onprops.js";
import * as retarget from "./retarget.js";

import getSymbols from "../util/symbols.js";
const { events } = getSymbols;

export function setup () {
	this.addPlugin(defineProps);

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

/**
 * Allows marking certain slots as dynamic and reacts to changes in those slots
 */

import SlotObserver from "./slot-observer.js";
import { getElement } from "./util.js";

let slotObserver = new SlotObserver(records => {
	let hosts = new Map();

	// Group by host
	for (let r of records) {
		let host = getElement(r.target);
		let hostRecords = hosts.get(host) ?? [];
		hostRecords.push(r);
		hosts.set(host, hostRecords);
	}

	for (let [host, hostRecords] of hosts) {
		host.slotsUpdated?.(hostRecords);
		host.constructor.hooks.run("slots-changed", { context: host, records: hostRecords });
	}
});

export const hooks = {
	constructed () {
		slotObserver.observe(this, { subtree: true });
	},

	define_slot ({name, definition, oldDefinition}) {
		if (!definition.dynamic) {
			return;
		}

		if (oldDefinition.dynamic) {
			// Unobserve first, in case options were different
			slotObserver.unobserve(this);
		}

		if (typeof definition.dynamic !== "object") {
			definition.dynamic = { addRemove: true, rename: true };
		}

		slotObserver.observe(this, definition.dynamic);
	},
};

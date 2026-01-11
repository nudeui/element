/**
 * Allows marking certain slots as dynamic and reacts to changes in those slots
 */

import SlotObserver from "./util/slot-observer.js";
import { getElement } from "./util.js";
import base from "./base.js";

const dependencies = [base];

let slotObserver;

function getSlotObserver () {
	slotObserver ??= new SlotObserver(records => {
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
			host.$hook("slots-changed", { records: hostRecords });
		}
	});

	return slotObserver;
}

const hooks = {
	constructed () {
		getSlotObserver().observe(this, { subtree: true });
	},

	define_slot ({ name, definition, oldDefinition }) {
		if (!definition.dynamic) {
			return;
		}

		if (oldDefinition.dynamic) {
			// Unobserve first, in case options were different
			getSlotObserver().unobserve(this);
		}

		if (typeof definition.dynamic !== "object") {
			definition.dynamic = { addRemove: true, rename: true };
		}

		getSlotObserver().observe(this, definition.dynamic);
	},
};

export default { dependencies, hooks };

/**
 * Emulate named slot assignment in slotAssignment: 'manual'
 * so that we can use it together with imperative slot assignment
 * TODO:
 * - React to dynamic slot changes (added slots, removed slots, renamed slots)
 *
 */

import base, { slots } from "./base.js";
import { getElement } from "./util.js";

const dependencies = [base];

export const slottedObserver = new MutationObserver(records => {
	for (let r of records) {
		let host = getElement(r.target);

		if (r.type === "attributes") {
			host[slots].assign(r.target);
		}
		else {
			for (let node of r.addedNodes) {
				host[slots].assign(node);
			}
		}
	}
});

const hooks = {
	connected () {
		if (!this[slots]?.isManual) {
			// Nothing to do here
			return;
		}

		// Assign all children to their slots
		for (let child of this.childNodes) {
			this[slots].assign(child);
		}

		// Observe future changes
		// Fire when either a slot attribute changes, or the children change
		slottedObserver.observe(this, {
			childList: true,
			attributes: true,
			attributeFilter: ["slot"],
		});
	},

	disconnected () {
		slottedObserver.disconnect();
	},

	slots_changed (records) {
		for (let r of records) {
			let slot = r.target;

			// Get any children explicitly assigned to this slot by name
			// TODO should we just assume that an explicit [slot] trumps everything or should we use `getSlotFor()`?
			let assignedElements = this.querySelectorAll(`:scope > [slot="${slot.name}"]`);
			for (let element of assignedElements) {
				this[slots].assign(element);
			}
		}
	},

	get_slot_for ({ child }) {
		if (child.hasAttribute("slot")) {
			return child.getAttribute("slot");
		}
	},
};

export default { dependencies, hooks };

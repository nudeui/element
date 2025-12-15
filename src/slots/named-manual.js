/**
 * Emulate named slot assignment in slotAssignment: 'manual'
 * so that we can use it together with imperative slot assignment
 * TODO:
 * - React to dynamic slot changes (added slots, removed slots, renamed slots)
 *
 */

import base, { slots } from "./base.js";

export const dependencies = [base];

export const slottedObserver = new MutationObserver(records => {
	let host = records[0].target;
	if (host.nodeType !== Node.ELEMENT_NODE) {
		host = host.parentNode;
	}

	for (let r of records) {
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

export const hooks = {
	connected () {
		if (this[slots].shadowRoot?.slotAssignment !== "manual") {
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
};

export default { dependencies, hooks };

/**
 * Automatically assign children to slots by tag
 * In the future: by CSS selector
 * Doesn't yet handle:
 */

import base, { slots } from "./base.js";
import symbols from "../../symbols.js";
import SlotObserver from "./util/slot-observer.js";

SlotObserver.hooks.add("observe", function ({ moOptions }) {
	// TODO should observing this require explicit opt-in?
	moOptions.attributes ??= true;
	moOptions.attributeFilter ??= [];
	moOptions.attributeFilter.push("data-assign");
});

export const { autoAssign } = symbols.new;

const dependencies = [base];

function updateAutoAssign (host) {
	let slotElements = [...host[slots].shadowRoot.querySelectorAll("slot[data-assign]")];
	host[autoAssign] = slotElements.reduce((acc, slot) => {
		let tags = slot.dataset.assign.toLowerCase().split(/,\s*/);
		for (let tag of tags) {
			acc.set(tag, slot);
		}
		return acc;
	}, new Map());
}

function updateSlottedFor (host) {
	if (!host[autoAssign]) {
		return;
	}

	let selector = Array.from(host[autoAssign].keys()).join(", ");
	let children = Array.from(host.querySelectorAll(`:scope > ${selector}`));
	for (let child of children) {
		let autoSlot = host[autoAssign].get(child.nodeName.toLowerCase());

		if (child.assignedSlot === autoSlot) {
			// Already assigned to the correct slot
			continue;
		}

		host[slots].assign(child, autoSlot);
	}
}

const hooks = {
	connected () {
		if (!this[slots]?.isManual) {
			// Nothing to do here
			return;
		}

		updateAutoAssign(this);
		updateSlottedFor(this);
	},

	slots_changed () {
		let previousAutoAssign = this[autoAssign];
		updateAutoAssign(this);

		// TODO go over previousAutoAssign and update slotted for any children
		// that were previously assigned to a different slot
	},

	get_slot_for ({ child }) {
		let slots = this.constructor[slots];
		let tagName = child.nodeName.toLowerCase();
		return this[autoAssign].get(tagName);
	},
};

export default { dependencies, hooks };

/**
 * Allows marking certain slots as dynamic and reacts to changes in those slots
 */

import MutationObserver2 from "../../../mo2/index.js";

/**
 * @typedef {Object} SlotMutation
 * @property {string} [renamedFrom]
 * @property {Node} [addedTo]
 * @property {Node} [removedFrom]
 * @property {boolean} [fallback]
 */

export default class SlotObserver extends MutationObserver2 {
	observe (target, options = { }) {
		// Translate to SlotObserver options
		let moOptions = {};

		if (options.rename) {
			moOptions.attributes = true;
			moOptions.attributeFilter = ["name"];
		}

		if (options.addRemove) {
			moOptions.childList = true;
			moOptions.subtree = options.subtree !== false;
		}

		let env = { target, options, moOptions };
		this.$hook("observe", env);

		return super.observe(env.target, env.moOptions);
	}

	static callback (records, that) {
		let slotsChanged = new Map();

		for (let r of records) {
			let isTargetSlot = r.target.tagName === "SLOT";

			if (r.type === "attributes") {
				if (!isTargetSlot) {
					continue;
				}

				// Slot was renamed
				let mutation = slotsChanged.get(r.target) ?? {};
				// ??= because if it went A → B → C, we'd still summarize it as A → C
				mutation.renamedFrom ??= r.oldValue;
				slotsChanged.set(r.target, mutation);
			}
			else if (r.type === "childList" && !isTargetSlot) {
				for (let addedSlot of r.addedNodes) {
					if (addedSlot.tagName !== "SLOT") {
						continue;
					}

					let mutation = slotsChanged.get(addedSlot) ?? {};
					mutation.addedTo = r.target;
					slotsChanged.set(addedSlot, mutation);
				}

				for (let removedSlot of r.removedNodes) {
					if (removedSlot.tagName !== "SLOT") {
						continue;
					}

					let mutation = slotsChanged.get(removedSlot) ?? {};
					mutation.removedFrom = r.target;
					slotsChanged.set(removedSlot, mutation);
				}
			}
			else if (isTargetSlot) {
				let mutation = slotsChanged.get(r.target) ?? {};
				mutation.fallback = true;
				slotsChanged.set(r.target, mutation);
			}
		}

		if (slotsChanged.size > 0) {
			let records = slotsChanged.entries().map(([target, mutation]) => ({ target, ...mutation }));
			super.callback(records, that);
		}
	}
}

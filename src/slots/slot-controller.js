/**
 * Slot controller
 * Per-element data structure for accessing and manipulating slots
 */
import symbols from "../util/symbols.js";

export const { shadowRoot } = symbols.known;

export default class SlotController {
	constructor (host) {
		this.host = host;
	}

	/**
	 * Assign a child to a slot while preserving all other assigned nodes
	 * Only for manual assignment
	 * @param {string} slotName
	 * @param {Node} child
	 * @returns {HTMLSlotElement | null} The slot that was assigned to, or null if the slot is not found
	 */
	assign (child, slotName = child.slot) {
		let slot = this[slotName];

		if (slot) {
			slot.assign(...slot.assignedNodes(), child);
		}
		else {
			// Slot with that name not found, but still unassign from any existing slot
			if (child.assignedSlot) {
				let assignedNodes = new Set(child.assignedSlot.assignedNodes());
				assignedNodes.delete(child);
				child.assignedSlot.assign(...assignedNodes);
			}
		}

		return slot;
	}

	get $default () {
		return this[""];
	}

	set $default (slot) {
		this[""] = slot;
	}

	get shadowRoot () {
		return this.host[shadowRoot] ?? this.host.shadowRoot;
	}

	update (slotName) {
		if (slotName === "$default") {
			slotName = "";
		}

		let selector = slotName ? `slot[name="${slotName}"]` : `slot:not([name])`;
		this[slotName] = this.shadowRoot.querySelector(selector);
		return this[slotName];
	}

	get (slotName) {
		return this[slotName] ?? this.update(slotName);
	}

	static create (host) {
		return new Proxy(new SlotController(host), {
			get (target, slotName) {
				return target.get(slotName);
			},
		});
	}
}

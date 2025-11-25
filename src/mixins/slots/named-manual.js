/**
 * Emulate named slot assignment in slotAssignment: 'manual'
 * so that we can use it together with imperative slot assignment
 * TODO:
 * - React to dynamic slot changes (added slots, removed slots, renamed slots)
 *
 */
import SlotObserver from "./slot-observer.js";

let mutationObserver;

export function getSlot (host, child, slots) {
	let slotName = child.slot;

	if (slotName) {
		slots[slotName] ??= host.shadowRoot.querySelector(`slot[name="${slotName}"]`);
		return slots[slotName];
	}

	// Default slot
	return slots[""];
}

export function assign (child, slots) {
	let slot = getSlot(this, child, slots);
	if (slot) {
		let isAssigned = slot.assignedNodes().includes(child);

		if (!isAssigned) {
			slot.assign(child);
			slot.dispatchEvent(new Event("slotchange"), { bubbles: true });
		}
	}
}

export function unassign (child, slots) {
	let slot = getSlot(this, child, slots);
	if (slot) {
		const assignedNodes = slot.assignedNodes();
		let isAssigned = assignedNodes.includes(child);

		if (isAssigned) {
			slot.assign(...assignedNodes.filter(node => node !== child));
			slot.dispatchEvent(new Event("slotchange"), { bubbles: true });
		}
	}
}

export function slotsChanged (records) {
	for (let r of records) {
		// TODO
	}
}

export function Mixin (Super = HTMLElement, options = {}) {
	return class NamedManual extends Super {
		constructor () {
			super();
			this.init();
		}

		init () {
			if (this.shadowRoot?.slotAssignment !== "manual") {
				// Nothing to do here
				return;
			}

			// slotchange won’t fire in this case, so we need to do this the old-fashioned way
			mutationObserver ??= new MutationObserver(mutations => {
				let slots = {};

				let nodesToAssign = records.flatMap(r =>
					r.type === "attributes" ? [r.target] : r.addedNodes);
				let nodesToUnassign = records.flatMap(r =>
					r.type === "attributes" ? [] : r.removedNodes);

				for (let node of nodesToAssign) {
					assign(node, slots);
				}

				for (let node of nodesToUnassign) {
					unassign(node, slots);
				}
			});

			// Fire when either a slot attribute changes, or the children change
			mutationObserver.observe(this, {
				childList: true,
				attributes: true,
				attributeFilter: ["slot"],
			});

			if (options.dynamicSlots) {
				let slotObserver = new SlotObserver(records => {
					for (let r of records) {
						let slot = r.target;
						if (r.type === "renamed") {
							// TODO unassign all children from the old slot (or assign to other slot with that name, if one exists)
							// TODO assign any children with that slot name to the new slot
						}
						else if (r.type === "added") {
							// TODO are there any elements with that slot name?
						}
						else if (r.type === "removed") {
							// TODO Unassign all children from this slot
						}
					}
				});
				slotObserver.observe(this);
			}
		}
	};
}

export default Mixin();

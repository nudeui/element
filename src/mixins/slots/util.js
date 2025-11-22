export function getSlotNodes (slot) {
	let childNodes = (slot.getRootNode()).childNodes;
	let name = slot.name;
	let selector = [];

	if (slot.name !== "default") {
		selector.push(`[slot="${name}"]`);
	}

	if (slot.dataset.assign) {
		// Explicit slot assignment by name takes priority
		selector.push(`:is(${slot.dataset.assign}):not([slot])`);
	}

	selector = selector.join(", ");

	return childNodes.filter(child => {
		if (child.matches) {
			return child.matches(selector);
		}
		if (child.nodeType === Node.TEXT_NODE) {
			return slot.name === "default";
		}
	});
}


/**
 * Assign nodes to slots based on a mix of explicit slot assignment and automatic assignment by CSS selector
 */
export function assignToSlot (slot) {
	let nodes = getSlotNodes(slot);
	let affectedSlots = new Set(nodes.map(node => node.assignedSlot));

	let nodesChanged = iterableEquals(slot.assignedNodes(), nodes);

	if (!nodesChanged) {
		return;
	}

	slot.assign(...nodes);
	slot.dispatchEvent(new Event("slotchange"), { bubbles: true });

	affectedSlots.delete(slot);

	for (let affectedSlot of affectedSlots) {
		affectedSlot.dispatchEvent(new Event("slotchange"), { bubbles: true });
	}
}

function iterableEquals (iterable1, iterable2) {
	let set1 = iterable1 instanceof Set ? iterable1 : new Set(iterable1);
	let set2 = iterable2 instanceof Set ? iterable2 : new Set(iterable2);
	return set1.size === set2.size && Array.from(iterable1).every(item => set2.has(item));
}

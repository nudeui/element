import defineMixin from "../mixins/define-mixin.js";

function assignSlots () {
	let children = this.childNodes;
	let slotElements = Object.values(this._slots);
	let assignments = new WeakMap();

	// Assign to slots
	for (let child of children) {
		let assignedSlot;

		if (child.slot) {
			// Explicit slot assignment by name, this takes priority
			assignedSlot = this._slots[child.slot];
		}
		else if (child.matches) {
			// Does child match any slot selector?
			assignedSlot = slotElements.find(slot => child.matches(slot.dataset.assign));
		}

		assignedSlot ??= this._slots.default;
		let all = assignments.get(assignedSlot) ?? new Set();
		all.add(child);
		assignments.set(assignedSlot, all);
	}

	for (let slot of slotElements) {
		let all = assignments.get(slot) ?? new Set();
		slot.assign(...all);
	}
}

let mutationObserver;

export default function  (Class) {
	// Class.prototype.assignSlots = assignSlots;

	return defineMixin(Class, function init () {
		if (!this.shadowRoot) {
			return;
		}

		this._slots = {};

		for (let slot of this.shadowRoot.querySelectorAll("slot")) {
			let name = slot.name ?? "default";
			// This emulates how slots normally work: if there are duplicate names, the first one wins
			// See https://codepen.io/leaverou/pen/KKLzBPJ
			this._slots[name] ??= slot;
		}

		if (this.shadowRoot.slotAssignment === "manual") {
			// slotchange won’t fire in this case, so we need to do this the old-fashioned way
			mutationObserver ??= new MutationObserver(mutations => {
				for (let mutation of mutations) {
					assignSlots.call(mutation.target);
				}
			});
			mutationObserver.observe(this, { childList: true });
		}
	});
}

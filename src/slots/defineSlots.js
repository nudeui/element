import { assignToSlot } from "./util.js";

let mutationObserver;

export const Mixin = (Super = HTMLElement) => class DefineSlots extends Super {
	init () {
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
					let slot = mutation.target;
					assignToSlot(slot);
					// TODO what to do with affectedSlots?
				}
			});
			mutationObserver.observe(this, { childList: true });
		}
	}
};

export default Mixin();

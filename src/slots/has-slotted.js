import SlotObserver from "./slot-observer.js";

/**
 * :has-slotted polyfill
 * Use like :is(:has-slotted, .has-slotted)
 */

function update (slot) {
	slot.classList.toggle("has-slotted", slot.assignedNodes().length > 0);
}

const SUPPORTS_HAS_SLOTTED = globalThis.CSS?.supports("selector(:has-slotted)");

export const hooks = {
	first_connected () {
		// Get all slots
		if (SUPPORTS_HAS_SLOTTED) {
			return;
		}

		this.addEventListener("slotchange", event => {
			update(event.target);
		});

		let slotObserver = new SlotObserver(records => {
			for (let r of records) {
				update(r.target);
			}
		});

		slotObserver.observe(this);
	},
};

export default { hooks };

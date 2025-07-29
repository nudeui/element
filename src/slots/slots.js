import SlotObserver from "./slot-observer.js";

/**
 * Slots data structure
 * Gives element classes a this._slots data structure that allows easy access to named slots
 */

function removeArrayItem (array, item) {
	if (!array || array.length === 0) {
		return -1;
	}

	let index = array.indexOf(item);
	if (index !== -1) {
		array.splice(index, 1);
	}

	return index;
}

export class Slots {
	#host;
	#slotObserver;
	#all = {};

	static mutationObserver;

	constructor (host) {
		this.#host = host;
	}

	init () {
		let shadowRoot = this.#host.shadowRoot;

		if (!shadowRoot) {
			return null;
		}

		for (let slot of shadowRoot.querySelectorAll("slot")) {
			let name = slot.name || "";

			this.#all[name] ??= [];
			this.#all[name].push(slot);

			// This emulates how slots normally work: if there are duplicate names, the first one wins
			// See https://codepen.io/leaverou/pen/KKLzBPJ
			this[name] ??= slot;
		}
	}

	/** Observe slot mutations */
	observe (options) {
		this.#slotObserver ??= new SlotObserver(records => {
			for (let r of records) {
				this[r.type](r.target, r.oldName);
			}
		});

		this.#slotObserver.observe(this.#host, options);
	}

	/** Stop observing slot mutations */
	unobserve () {
		this.#slotObserver?.disconnect();
	}

	/** Slot added */
	added (slot) {
		let name = slot.name ?? "";
		this.#all[name] ??= [];

		// Insert, maintaining source order
		let index = this.#all[name].findIndex(
			s => slot.compareDocumentPosition(s) & Node.DOCUMENT_POSITION_PRECEDING,
		);
		this.#all[name].splice(index + 1, 0, slot);
		this[name] = this.#all[name][0];

		if (!this[name]) {
			delete this[name];
		}
	}

	/** Slot removed */
	removed (slot, name = slot.name ?? "") {
		removeArrayItem(this.#all[name], slot);
		this[name] = this.#all[name][0];

		if (!this[name]) {
			delete this[name];
		}
	}

	/** Slot renamed */
	renamed (slot, oldName) {
		// ||= is important here, as slot.name is "" in the default slot
		this.remove(slot, oldName);
		this.add(slot);
	}
}

export default function  (Class, options = {}) {
	let { slotsProperty = "_slots", dynamicSlots = false } = options;

	return {
		start () {
			this[slotsProperty] = new Slots(this);
		},
		init () {
			let slots = this[slotsProperty];
			slots.init();

			if (dynamicSlots) {
				slots.observe();
			}
		},
	};
}

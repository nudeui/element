import symbols from "../../symbols.js";

/**
 * :has-slotted polyfill
 * Use like :is(:has-slotted, .has-slotted)
 */

const SUPPORTS_HAS_SLOTTED = globalThis.CSS?.supports("selector(:has-slotted)");

const hooks = SUPPORTS_HAS_SLOTTED ? {} : {
	constructed () {
		let shadowRoot = this[symbols.known.shadowRoot] ?? this.shadowRoot;
		shadowRoot.addEventListener("slotchange", event => {
			let slot = event.target;
			slot.classList.toggle("has-slotted", slot.assignedNodes().length > 0);
		});
	},
};

export default { hooks };

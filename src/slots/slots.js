import SlotController from "./slot-controller.js";
import { getSymbols } from "../util/get-symbols.js";

const defaultOptions = {
	slotsProperty: "_slots",
	dynamicSlots: false,
};

const { hasConnected } = getSymbols;

export function Mixin (Super = HTMLElement, options = {}) {
	options = { ...defaultOptions, ...options };
	let { slotsProperty, dynamicSlots } = options;

	return class HasSlots extends Super {
		init () {
			super.init?.();
			this[slotsProperty] = new SlotController(this, {dynamic: dynamicSlots});
		}

		connectedCallback () {
			super.connectedCallback?.();

			if (this[hasConnected]) {
				return;
			}

			this[hasConnected] = true;

			this[slotsProperty].init();
		}
	}
}

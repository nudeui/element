import SlotController from "./slot-controller.js";
import newSymbols from "../util/symbols.js";

const defaultOptions = {
	slotsProperty: "_slots",
	dynamicSlots: false,
};

const { hasConnected } = newSymbols;

export function Mixin (Super = HTMLElement, options = {}) {
	options = { ...defaultOptions, ...options };
	let { slotsProperty, dynamicSlots } = options;

	return class HasSlots extends Super {
		constructor () {
			super();
			this.init();
		}

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

/**
 * Mixin to add additional lifecycle hooks
 * Instance hooks:
 * - `init`: Called when constructing an instance of the class (used by many mixins)
 * - `constructed`: Async called after the element is fully constructed (including after any subclasses)
 * Class hooks:
 * - `init`: Called when the first instance of the class is created
 * - `anyConnected`: Called when any instance of the class is connected to the DOM (once per class)
 */
import { getSymbols } from "./util/get-symbols.js";

const { hasConnected, initialized } = getSymbols;

const instanceHooks = ["firstConnected", "constructed", "init"];
const staticHooks = ["anyConnected", "init"];

export function appliesTo (Class) {
	return instanceHooks.some(hook => Class.prototype[hook]) || staticHooks.some(hook => Class[hook]);
}

export const Mixin = (Super = HTMLElement) => class MountedMixin extends Super {
	constructor () {
		super();

		if (!Object.hasOwn(this.constructor, initialized) && this.constructor.init) {
			// First instance of this class to be created
			this.constructor[initialized] = true;
			this.constructor.init();
		}

		this.init?.();
		Promise.resolve().then(() => this.constructed?.());
	}

	connectedCallback () {
		super.connectedCallback?.();

		if (!this[hasConnected]) {
			// First time this element is connected
			if (!Object.hasOwn(this.constructor, hasConnected) && this.constructor.anyConnected) {
				// First element of this type to be connected
				this.constructor[hasConnected] = true;
				this.constructor.anyConnected();
			}

			this[hasConnected] = true;
			this.firstConnected?.();
		}

		this[hasConnected] = true;
	}

	static appliesTo = appliesTo;
};

Mixin.appliesTo = appliesTo;
export default Mixin();


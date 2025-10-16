/**
 * Mixin to add a functions that run the first time an element connects
 * both on a per-element and a per-class basis
 */
export const hasConnected = Symbol("is mounted");
export const anyMounted = Symbol("any instance mounted");

export class MountedMixin extends HTMLElement {
	connectedCallback () {
		if (this[hasConnected]) {
			return;
		}

		this.mounted?.();

		this[hasConnected] = true;
	}

	/** Automatically gets called the first time the element is connected */
	mounted() {
		this.constructor.mounted();
	}

	/** Automatically gets called the first time an instance is connected */
	static mounted () {
		if (Object.hasOwn(this, anyMounted)) {
			return;
		}

		this[anyMounted] = true;
	}
}

export default MountedMixin;

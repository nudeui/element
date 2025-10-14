/**
 * Mixin to add a mounted function that runs the first time an element connects
 */
export const hasConnected = Symbol("is mounted");

export class MounteddMixin extends HTMLElement {
	connectedCallback () {
		if (this[hasConnected]) {
			return;
		}

		this.mounted?.();

		this[hasConnected] = true;
	}

	/** Automatically gets called the first time the element is connected */
	mounted() {

	}
}

export default MounteddMixin;

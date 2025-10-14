/**
 * Mixin to add a mounted function that runs the first time an element connects
 */
export const hasConnected = Symbol("is mounted");

export class MountedMixin extends HTMLElement {
	connectedCallback () {
		if (this[hasConnected]) {
			return;
		}

		this.mounted?.();

		this[hasConnected] = true;
	}

	/** Automatically gets called the first time the element is connected */
	mounted () {
		// Stuff that runs once per element
		this.constructor.hooks.run("init", this);
	}
}

export default MountedMixin;

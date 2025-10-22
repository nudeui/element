export class ConstructedMixin extends HTMLElement {
	init() {
		// We use a microtask so that this executes after the subclass constructor has run as well
		Promise.resolve().then(() => this.constructed());
	}

	constructed () {
		// Ensure the method exists
	}
}

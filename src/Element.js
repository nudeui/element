/**
 * Base class for all elements
 */
import defineProps from "./props/defineProps.js";
import defineFormAssociated from "./formAssociated.js/defineFormAssociated.js";
import defineEvents from "./events/defineEvents.js";

let instanceInitialized = Symbol("instanceInitialized");
let classInitialized = Symbol("classInitialized");

const Self = class NudeElement extends HTMLElement {
	constructor () {
		super();
		this.constructor.init();

		if (this.propChangedCallback && this.constructor.props) {
			this.addEventListener("propchange", this.propChangedCallback);
		}
	}

	connectedCallback () {
		if (!this[instanceInitialized]) {
			// Stuff that runs once per element
			this.constructor.initQueue.forEach(init => init.call(this));

			this[instanceInitialized] = true;
		}
	}

	static init () {
		// Stuff that runs once per class
		if (this[classInitialized]) {
			return;
		}

		this.initQueue ??= [];

		if (this.props) {
			defineProps(this);
		}

		if (this.events) {
			defineEvents(this);
		}

		if (this.formAssociated) {
			defineFormAssociated(this);
		}

		this[classInitialized] = true;
	}
}

export default Self;
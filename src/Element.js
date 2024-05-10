/**
 * Base class for all elements
 */
import defineProps from "./props/defineProps.js";
import defineFormAssociated from "./formAssociated.js/defineFormAssociated.js";
import defineEvents from "./events/defineEvents.js";

const Self = class NudeElement extends HTMLElement {
	#initialized = false;

	constructor () {
		super();
		this.constructor.init();

		if (this.propChangedCallback && this.constructor.props) {
			this.addEventListener("propchange", this.propChangedCallback);
		}
	}

	connectedCallback () {
		if (!this.#initialized) {
			// Stuff that runs once per element
			this.constructor.initQueue.forEach(init => init.call(this));

			this.#initialized = true;
		}
	}

	static init () {
		// Stuff that runs once per class
		if (this._initialized) {
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

		this._initialized = true;
	}
}

export default Self;
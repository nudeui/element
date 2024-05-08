/**
 * Base class for all elements
 */
import Props from "../Props.js";
import defineFormAssociated from "./formAssociated.js/defineFormAssociated.js";
import defineEvents from "./events/defineEvents.js";

const Self = class NudeElement extends HTMLElement {
	static postConstruct = [];
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
			for (let init of this.constructor.postConstruct) {
				init.call(this);
			}
			this.initializeProps?.();
			this.#initialized = true;
		}
	}

	static init () {
		// Stuff that runs once per class
		if (this._initialized) {
			return;
		}

		if (this.events) {
			defineEvents(this)
		}

		if (this.props) {
			Props.create(this);
		}

		if (this.formAssociated) {
			defineFormAssociated(this);
		}

		this._initialized = true;
	}
}

export default Self;
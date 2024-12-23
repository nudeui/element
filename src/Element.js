/**
 * Base class for all elements
 */
import defineProps from "./props/defineProps.js";
import defineFormAssociated from "./formAssociated.js/defineFormAssociated.js";
import defineEvents from "./events/defineEvents.js";
import defineSlots from "./slots/defineSlots.js";
import Hooks from "./mixins/hooks.js";

let instanceInitialized = Symbol("instanceInitialized");
let classInitialized = Symbol("classInitialized");

const Self = class NudeElement extends HTMLElement {
	constructor () {
		super();

		if (!this.constructor[classInitialized]) {
			this.constructor.init();
		}

		this.constructor.hooks.run("start", this);

		if (this.propChangedCallback && this.constructor.props) {
			this.addEventListener("propchange", this.propChangedCallback);
		}

		Promise.resolve().then(this.constructor.hooks.run("constructed", this));
	}

	connectedCallback () {
		if (!this[instanceInitialized]) {
			// Stuff that runs once per element
			this.constructor.hooks.run("init", this);

			this[instanceInitialized] = true;
		}

		if (this.constructor.globalStyleSheet) {
			let rootNode = this.getRootNode();
			let stylesheet = rootNode.querySelector(`style[data-for="${this.constructor.tagName}"]`);

			if (!stylesheet) {
				let root = rootNode.nodeType === Node.DOCUMENT_NODE ? rootNode.head : rootNode;
				stylesheet = this.constructor.globalStyleSheet.cloneNode(true);
				root.append(stylesheet);
			}

			stylesheet.onload = () => {
				let name = `${this.constructor.tagName}-global-style-ready`;
				(rootNode.body ?? rootNode).classList.add(name);
				this.constructor.hooks.run(name, this);
			};
		}

		this.constructor.hooks.run("connected", this);
	}

	disconnectedCallback () {
		this.constructor.hooks.run("disconnected", this);
	}

	static init () {
		// Stuff that runs once per class
		if (this[classInitialized]) {
			return false;
		}

		this.hooks = new Hooks(this.hooks);

		if (this.props) {
			defineProps(this);
		}

		if (this.events) {
			defineEvents(this);
		}

		if (this.formAssociated) {
			defineFormAssociated(this);
		}

		if (this.globalStyle) {
			this.globalStyleSheet = document.createElement("style");
			this.globalStyleSheet.dataset.for = this.tagName;

			let styles = Array.isArray(this.globalStyle) ? this.globalStyle : [this.globalStyle];
			let imports = [];
			let rules = [];
			styles.forEach(style => {
				// Try converting `style` to a URL and using it inside an `@import` rule; otherwise, use it as-is
				try {
					let url = new URL(style);
					imports.push(`@import url("${ url.href }");`);
				}
				catch {
					rules.push(style);
				}

			});

			// Place `@import` rules at the top of the stylesheet, preserving the original order of the URLs
			this.globalStyleSheet.textContent = [...imports, ...rules].join("\n");
		}

		this.hooks.run("setup", this);

		return this[classInitialized] = true;
	}
};

export default Self;

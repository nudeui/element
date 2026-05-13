import Props from "./util/Props.js";
import { symbols } from "xtensible";
import { defineOwnProperty } from "xtensible/util";
import { defineLazyProperty } from "../../util/lazy.js";

export const { props } = symbols.known;
const { observedAttributes } = symbols.known;

const hooks = {
	setup () {
		// Skip if the static observedAttributes getter already ran the install —
		// it's the registration-time path that fires before any instance exists.
		if (Object.hasOwn(this, "props") && !Object.hasOwn(this, observedAttributes)) {
			this.defineProps();
		}
	},

	constructor () {
		if (!this.constructor[props]) {
			return;
		}

		// Per-prop callback: auto-wire to propchange events.
		if (this.propChangedCallback) {
			this.addEventListener("propchange", this.propChangedCallback);
		}

		// Bulk callback: auto-wire to the propschange event.
		if (this.updated) {
			this.addEventListener("propschange", this.updated);
		}
	},

	constructed () {
		this.constructor[props].initializeFor(this);
	},

	connected () {
		this.constructor[props].connected(this);
	},
};

const provides = {
	// ...composed({
	// 	attributeChangedCallback (name, oldValue, value) {
	// 		this.constructor[props].attributeChanged(this, name, oldValue, value);
	// 	},
	// }),
};

// Internal prop values
defineLazyProperty(provides, "props", {
	get () {
		return {};
	},
	configurable: true,
	writable: true,
});

// Ignore mutations on these attributes
defineLazyProperty(provides, "ignoredAttributes", {
	get () {
		return new Set();
	},
	configurable: true,
	writable: true,
});

const providesStatic = {
	defineProps (def = this.props) {
		if (def instanceof Props && def.Class === this) {
			// Already defined
			return null;
		}

		let env = { props: def };
		this.$hook("define-props", env);

		this[props].add(env.props);
	},

	// ...composed({
	// 	get observedAttributes () {
	// 		let thisProps = this[props].observedAttributes ?? [];
	// 		let superProps = this.super?.observedAttributes ?? [];
	// 		return [...superProps, ...thisProps];
	// 	},
	// }),

	get observedAttributes () {
		if (Object.hasOwn(this, observedAttributes)) {
			return this[observedAttributes];
		}

		// Reserve the cache before defineProps so any consumer that reads
		// Class.observedAttributes during the install (e.g., a define-props
		// hook listener) gets the in-flight list instead of recursing.
		this[observedAttributes] = [];
		this.defineProps();

		// Must land before customElements.define snapshots the prototype callbacks;
		// a later patch is invisible to post-mount setAttribute reactions.
		// https://html.spec.whatwg.org/multipage/custom-elements.html#element-definition
		// TODO how does this work if attributeChangedCallback is inherited?
		if (!Object.hasOwn(this.prototype, "attributeChangedCallback")) {
			let _attributeChangedCallback = this.prototype.attributeChangedCallback;
			this.prototype.attributeChangedCallback = function (name, oldValue, value) {
				this.constructor[props].attributeChanged(this, name, oldValue, value);
				_attributeChangedCallback?.call(this, name, oldValue, value);
			};
		}

		// FIXME how to combine with existing observedAttributes?
		return (this[observedAttributes] = this[props].observedAttributes);
	},
};

defineOwnProperty(providesStatic, props, function () {
	return new Props(this);
});

export default { hooks, provides, providesStatic };

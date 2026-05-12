import Props from "./util/Props.js";
import { symbols } from "xtensible";
import { defineOwnProperty } from "xtensible/util";
import { defineLazyProperty } from "../../util/lazy.js";

export const { props } = symbols.known;
const { observedAttributes } = symbols.known;

function first_constructor_static () {
	// TODO how does this work if attributeChangedCallback is inherited?
	let _attributeChangedCallback = this.prototype.attributeChangedCallback;
	this.prototype.attributeChangedCallback = function (name, oldValue, value) {
		this.constructor[props].attributeChanged(this, name, oldValue, value);
		_attributeChangedCallback?.call(this, name, oldValue, value);
	};
}

const hooks = {
	setup () {
		if (Object.hasOwn(this, "props")) {
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

	first_constructor_static,

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
		if ((def instanceof Props && def.Class === this) || this[props].size > 0) {
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

		// Reserve the cache before defineProps so a `define-props` hook that reads
		// Class.observedAttributes returns the in-flight list instead of recursing.
		this[observedAttributes] = [];
		this.defineProps();

		// FIXME how to combine with existing observedAttributes?
		return (this[observedAttributes] = this[props].observedAttributes);
	},
};

defineOwnProperty(providesStatic, props, function () {
	return new Props(this);
});

export default { hooks, provides, providesStatic };

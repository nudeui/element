import Props from "./util/Props.js";
import symbols from "../../symbols.js";
import { defineLazyProperty } from "../../util/lazy.js";
import { defineOwnProperty } from "../../extensible.js";

export const { props } = symbols.known;

function first_constructor_static () {
	// TODO how does this work if attributeChangedCallback is inherited?
	let _attributeChangedCallback = this.prototype.attributeChangedCallback;
	this.prototype.attributeChangedCallback = function (name, oldValue, value) {
		this.constructor[props].attributeChanged(this, name, oldValue, value);
		_attributeChangedCallback?.call(this, name, oldValue, value);
	};

	// FIXME how to combine with existing observedAttributes?
	if (!Object.hasOwn(this, "observedAttributes")) {
		Object.defineProperty(this, "observedAttributes", {
			get: () => this[props].observedAttributes,
			configurable: true,
		});
	}
}

const hooks = {
	setup () {
		if (Object.hasOwn(this, "props")) {
			this.defineProps();
		}
	},

	constructor () {
		if (this.propChangedCallback && this.constructor[props]) {
			this.addEventListener("propchange", this.propChangedCallback);
		}
	},

	first_constructor_static,

	first_connected () {
		this.constructor[props].initializeFor(this);
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
};

defineOwnProperty(providesStatic, props, function () {
	return new Props(this);
});

export default { hooks, provides, providesStatic };

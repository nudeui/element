import Props from "./Props.js";
import { defineLazyProperty, symbols } from "../plugins/index.js";

let { props } = symbols.known;

function setup () {
	// TODO how does this work if attributeChangedCallback is inherited?
	let _attributeChangedCallback = this.prototype.attributeChangedCallback;
	this.prototype.attributeChangedCallback = function (name, oldValue, value) {
		this.constructor.props.attributeChanged(this, name, oldValue, value);
		_attributeChangedCallback?.call(this, name, oldValue, value);
	};

	// FIXME how to combine with existing observedAttributes?
	if (!Object.hasOwn(this, "observedAttributes")) {
		Object.defineProperty(this, "observedAttributes", {
			get: () => this.props.observedAttributes,
			configurable: true,
		});
	}

	if (this.props) {
		this.defineProps();
	}
}

export const hooks = {
	constructor () {
		if (this.propChangedCallback && this.constructor.props) {
			this.addEventListener("propchange", this.propChangedCallback);
		}
	},

	setup,

	first_connected () {
		this.constructor.props.initializeFor(this);
	},
};

export const provides = {
	// ...composed({
	// 	attributeChangedCallback (name, oldValue, value) {
	// 		this.constructor.props.attributeChanged(this, name, oldValue, value);
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

export const providesStatic = {
	defineProps (def = this[props] ?? this.props) {
		if (def instanceof Props && def.Class === this) {
			// Already defined
			return null;
		}

		// TODO move to symbol for Props object too?
		if (this.props instanceof Props) {
			// Props already defined, add these props to it
			this.props.add(def);
			return;
		}

		// First time defining props
		this[props] = this.props;
		this.props = new Props(this, def);
	},

	// ...composed({
	// 	get observedAttributes () {
	// 		let thisProps = this.props.observedAttributes ?? [];
	// 		let superProps = this.super?.observedAttributes ?? [];
	// 		return [...superProps, ...thisProps];
	// 	},
	// }),
};

export default {hooks, provides, providesStatic};

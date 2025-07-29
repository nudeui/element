import Props from "./Props.js";
import defineMixin from "../mixins/defineMixin.js";

let propsSymbol = Symbol("propsSymbol");

export default function defineProps (Class, props = Class[propsSymbol] ?? Class.props) {
	if (props instanceof Props && props.Class === Class) {
		// Already defined
		return null;
	}

	if (Class.props instanceof Props) {
		// Props already defined, add these props to it
		Class.props.add(props);
		return;
	}

	Class[propsSymbol] = Class.props;
	props = Class.props = new Props(Class, props);

	let _attributeChangedCallback = Class.prototype.attributeChangedCallback;
	Class.prototype.attributeChangedCallback = function (name, oldValue, value) {
		this.constructor.props.attributeChanged(this, name, oldValue, value);
		_attributeChangedCallback?.call(this, name, oldValue, value);
	};

	// FIXME how to combine with existing observedAttributes?
	if (!Object.hasOwn(Class, "observedAttributes")) {
		Object.defineProperty(Class, "observedAttributes", {
			get: () => this.props.observedAttributes,
			configurable: true,
		});
	}

	return defineMixin(Class, {
		init () {
			this.constructor.props.initializeFor(this);
		},
		properties: {
			// Internal prop values
			props () {
				return {};
			},
			// Ignore mutations on these attributes
			ignoredAttributes () {
				return new Set();
			},
		},
	});
}


import Props from "./Props.js";
import {
	defineLazyProperty,
	queueInitFunction,
} from "../util.js";


function init () {
	this.constructor.props.initializeFor(this);
}

export default function defineProps (Class, props = Class.props) {
	if (props instanceof Props && props.Class === Class) {
		// Already defined
		return null;
	}

	if (Class.props instanceof Props) {
		// Props already defined, add these props to it
		Class.props.add(props);
		return;
	}

	props = Class.props = new Props(Class, props);

	// Internal prop values
	defineLazyProperty(Class.prototype, "props", el => ({}));

	// Ignore mutations on these attributes
	defineLazyProperty(Class.prototype, "ignoredAttributes", el => new Set());

	let _attributeChangedCallback = Class.prototype.attributeChangedCallback;
	Class.prototype.attributeChangedCallback = function (name, oldValue, value) {
		this.constructor.props.attributeChanged(this, name, oldValue, value);
		_attributeChangedCallback?.call(this, name, oldValue, value);
	}

	// FIXME how to combine with existing observedAttributes?
	if (!Object.hasOwn(Class, "observedAttributes")) {
		Object.defineProperty(Class, "observedAttributes", {
			get: () => this.props.observedAttributes,
			configurable: true,
		});
	}

	return queueInitFunction(Class, init);
}
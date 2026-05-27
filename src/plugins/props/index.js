import Props from "./util/Props.js";
import Prop from "./util/Prop.js";
import ElementProps from "./util/ElementProps.js";
import ElementProp from "./util/ElementProp.js";
import { symbols } from "xtensible";
import { defineOwnProperty, getSuperMethod } from "xtensible/util";
import { defineLazyProperty } from "../../util/lazy.js";
import PropType from "./util/PropType.js";
import "./types/index.js";

export const { props } = symbols.known;

export { PropType, Props, Prop, ElementProps, ElementProp };

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

		if (this.propChangedCallback) {
			this.addEventListener("propchange", this.propChangedCallback);
		}
	},

	connected () {
		this.props.paused = false;
	},

	disconnected () {
		this.props.paused = true;
	},

	"attribute-changed" ({ name, oldValue }) {
		this.props.attributeChanged(name, oldValue);
	},
};

const provides = {
	props: undefined, // see below

	// Must be on the prototype before customElements.define runs — spec reads observedAttributes only if ACB is non-null.
	attributeChangedCallback (name, oldValue, value) {
		// super.attributeChangedCallback()
		getSuperMethod(this, provides.attributeChangedCallback)?.call(this, name, oldValue, value);

		this.$hook("attribute-changed", { name, oldValue, value });
	},

	constructor: {
		defineProps (def = this.props) {
			if (def instanceof Props && def.Class === this) {
				// Already defined
				return null;
			}

			let env = { props: def };
			this.$hook("define-props", env);

			this[props].add(env.props);
		},

		get observedAttributes () {
			// FIXME how to combine with existing observedAttributes?
			let attributes = [...this[props].allValues()]
				.map(prop => prop.reflect.from)
				.filter(Boolean);
			return [...new Set(attributes)];
		},
	},
};

/**
 * Per-element collection of {@link ElementProp} wrappers, materialized on
 * first access. The {@link ElementProps} constructor self-installs as the
 * element's own `props` data property, shadowing this accessor from then on.
 */
defineLazyProperty(provides, "props", {
	get () {
		if (this.constructor.props) {
			return new ElementProps(this);
		}
	},
	configurable: true,
	writable: true,
});

defineOwnProperty(provides.constructor, props, function () {
	return new Props(this, this.props);
});

export default { hooks, provides };

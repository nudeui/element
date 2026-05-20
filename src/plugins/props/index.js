import Props from "./util/Props.js";
import ElementProps from "./util/ElementProps.js";
import { symbols } from "xtensible";
import { defineOwnProperty } from "xtensible/util";
import { defineLazyProperty } from "../../util/lazy.js";

export const { props } = symbols.known;
const { observedAttributes } = symbols.known;

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

	connected () {
		this.props.resumeEvents();
	},

	disconnected () {
		this.props.pauseEvents();
	},

	"attribute-changed" ({ name, oldValue }) {
		this.props.attributeChanged(name, oldValue);
	},
};

const provides = {
	props: undefined, // see below

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

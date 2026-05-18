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
		if (this.propChangedCallback && this.constructor[props]) {
			this.addEventListener("propchange", this.propChangedCallback);
		}
	},

	constructed () {
		this.constructor[props].initializeFor(this);
	},

	connected () {
		this.constructor[props].resumeEvents(this);
	},

	disconnected () {
		this.constructor[props].pauseEvents(this);
	},

	"attribute-changed" ({ name, oldValue, value }) {
		this.constructor[props].attributeChanged(this, name, oldValue, value);
	},
};

const provides = {};

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

		// FIXME how to combine with existing observedAttributes?
		return (this[observedAttributes] = this[props].observedAttributes);
	},
};

defineOwnProperty(providesStatic, props, function () {
	return new Props(this);
});

export default { hooks, provides, providesStatic };

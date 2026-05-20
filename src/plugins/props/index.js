import Props from "./util/Props.js";
import ElementProps from "./util/ElementProps.js";
import { symbols } from "xtensible";
import { defineOwnProperty } from "xtensible/util";

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
		// Create the per-element ElementProps now, after the element constructor
		// and all sync pre-mount setup has completed. The ElementProps
		// constructor self-installs as `this.props` and runs the full mount
		// pass (shadow recovery + attr-read + default-fire), then resumes
		// event dispatch.
		new ElementProps(this);
	},

	connected () {
		this.props?.resumeEvents();
	},

	disconnected () {
		this.props?.pauseEvents();
	},

	"attribute-changed" ({ name, oldValue }) {
		// Pre-mount attribute writes (before `constructed` fires) leave the
		// attribute on the element; ElementProps' constructor reads it during
		// init. No need to handle them here.
		this.props?.attributeChanged(name, oldValue);
	},
};

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

export default { hooks, providesStatic };

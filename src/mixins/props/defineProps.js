import Props from "./Props.js";
import { newSymbols, satisfiedBy } from "../../util/symbols.js";
import { defineLazyProperties } from "../../util/lazy.js";
const { initialized, propsDef } = newSymbols;

export const Mixin = (Super = HTMLElement) => class WithProps extends Super {
	constructor () {
		super();
		this.init();
	}

	init () {
		this.constructor.init();

		defineLazyProperties(this, {
			// Internal prop values
			props () {
				return {};
			},
			// Ignore mutations on these attributes
			ignoredAttributes () {
				return new Set();
			},
		});

		// Should this use Object.hasOwn()?
		if (this.propChangedCallback) {
			this.addEventListener("propchange", this.propChangedCallback);
		}

		this.constructor.props.initializeFor(this);
	}

	attributeChangedCallback (name, oldValue, value) {
		super.attributeChangedCallback?.(name, oldValue, value);

		this.constructor.props.attributeChanged(this, name, oldValue, value);
	}

	static get observedAttributes () {
		return [
			...(super.observedAttributes ?? []),
			...(this.constructor.props.observedAttributes ?? []),
		];
	}

	static init () {
		if (this[initialized]) {
			return;
		}

		this[initialized] = true;

		if (this.props) {
			this.defineProps();
		}
	}

	static defineProps (props = this.props) {
		if (props instanceof Props && props.Class === this) {
			// Already defined
			return null;
		}

		if (this.props instanceof Props) {
			// Props already defined, add these props to it
			this.props.add(props);
			return;
		}

		// First time processing props for this class
		this[propsDef] = this.props;
		props = this.props = new Props(this, props);
	}

	static [satisfiedBy] = "props";
};

export default Mixin();

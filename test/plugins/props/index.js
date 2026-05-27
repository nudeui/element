import { default as propsPlugin } from "../../../src/plugins/props/index.js";
import { defineElement } from "../../util/dom.js";
import reflection from "./reflection.js";
import defaults from "./defaults.js";
import computed from "./computed.js";
import propchange from "./propchange.js";
import propschange from "./propschange.js";
import lifecycle from "./lifecycle.js";
import inheritance from "./inheritance.js";
import install from "./install.js";
import observedAttributes from "./observed-attributes.js";

export default {
	name: "Props plugin",

	tests: [
		{
			name: "Behavior",

			beforeEach () {
				let { props, attributes, mixin } = this.arg;
				let tag = defineElement({ plugins: [propsPlugin], props, mixin });
				let element = document.createElement(tag);

				let events = [];
				// Each entry is [name, value-at-event-time].
				// Attached before connect so mount-time events are captured.
				element.addEventListener("propchange", e =>
					events.push([e.name, e.target[e.name]]));

				// Snapshot as [name, oldValue] tuples so tests can compare with
				// plain array equality.
				let propsEvents = [];
				element.addEventListener("propschange", e =>
					propsEvents.push([...e.changed]));

				for (let [name, value] of Object.entries(attributes ?? {})) {
					element.setAttribute(name, value);
				}

				document.body.append(element);

				Object.assign(this.data, { element, events, propsEvents });
			},

			afterEach () {
				this.data.element.remove();
			},

			tests: [reflection, defaults, computed, propchange, propschange, lifecycle],
		},
		inheritance,
		install,
		observedAttributes,
	],
};

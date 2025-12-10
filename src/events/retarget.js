/**
 * Retarget events from internal elements to the host
 */

import { resolveValue } from "../util.js";
import { pick } from "../util/pick.js";
import newSymbols from "../util/symbols.js";
const { events } = newSymbols;

export const hooks = {
	first_connected () {
		if (!this[events]) {
			return;
		}

		for (let [name, options] of Object.entries(this[events])) {
			let { from } = options;

			if (!from) {
				continue;
			}

			if (typeof from === "function") {
				from = { on: from };
			}

			let type = from?.type ?? name;

			// Event is a subset of another event (either on this element or other element(s))
			let target = resolveValue(from?.on, [this]) ?? this;
			let host = this;
			let listener = event => {
				if (!from.when || from.when(event)) {
					let EventConstructor = from.event ?? event.constructor;
					let source = from.constructor
						? // Construct specific event object
							pick(event, ["bubbles", "cancelable", "composed", "detail"])
						: // Retarget this event
							event;
					let options = Object.assign({}, source, from.options);

					let newEvent = new EventConstructor(name, options);
					host.dispatchEvent(newEvent);
				}
			};

			if (Array.isArray(target)) {
				for (let t of target) {
					t.addEventListener(type, listener);
				}
			}
			else {
				target.addEventListener(type, listener);
			}

		}

	},
};

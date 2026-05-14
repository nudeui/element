import { defineElement } from "../../util/dom.js";
import { default as propsPlugin } from "../../../src/plugins/props/index.js";
import { default as eventsPlugin } from "../../../src/plugins/events/index.js";

export default {
	name: "Shortcut events",

	tests: [
		{
			name: "first_connected shortcut re-fire carries a detail",
			description: "Late-bound on*= handlers only see the catch-up re-fire (issue #106)",
			run () {
				let tag = defineElement({
					plugins: [propsPlugin, eventsPlugin],
					props: { value: { type: String, default: "x" } },
					events: { valuechange: { propchange: "value" } },
				});

				// Declared via markup so the on*= handler binds late, like real
				// consumer usage — it then sees only the first_connected catch-up.
				let host = document.createElement("div");
				host.innerHTML = `<${tag} onvaluechange="(this._log ??= []).push(event.detail)"></${tag}>`;
				document.body.append(host);

				let element = host.firstElementChild;
				host.remove();

				return (element._log ?? []).map(detail => Object.keys(detail ?? {}).length > 0);
			},
			expect: [true],
		},
	],
};

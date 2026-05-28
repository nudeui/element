import { defineElement } from "../../util/dom.js";
import { default as propsPlugin } from "../../../src/plugins/props/base.js";
import { default as propschangePlugin } from "../../../src/plugins/props/propschange.js";
import { default as eventsPlugin } from "../../../src/plugins/events/index.js";

const flush = () => Promise.resolve();

export default {
	name: "Shortcut events",

	tests: [
		{
			name: "Markup on*= handlers catch the mount-time alias dispatch",
			description: "The on* prop's `changed` callback attaches the handler during prop init, before mount propchanges flush — so it receives the real mount alias with its original source (issue #106).",
			run () {
				let tag = defineElement({
					plugins: [propsPlugin, eventsPlugin],
					props: { value: { type: String, default: "x" } },
					events: { valuechange: { propchange: "value" } },
				});

				let host = document.createElement("div");
				host.innerHTML = `<${tag} onvaluechange="(this._log ??= []).push({value: event.value, source: event.source})"></${tag}>`;
				document.body.append(host);

				let element = host.firstElementChild;
				host.remove();

				return element._log ?? [];
			},
			expect: [{ value: "x", source: undefined }],
		},
		{
			name: "Shortcut events ride along on coalesced propchange and don't feed propschange",
			description: "Burst dispatches one propchange (old=1, value=3); the alias mirrors it, propschange sees only [v, 1].",
			async run () {
				let tag = defineElement({
					plugins: [propsPlugin, propschangePlugin, eventsPlugin],
					props: { v: { type: Number, default: 0 } },
					events: { valuechange: { propchange: "v" } },
				});
				let element = document.createElement(tag);
				document.body.append(element);

				let propsEvents = [];
				element.addEventListener("propschange", e => propsEvents.push([...e.changed]));

				element.v = 1; // stored old before the burst
				let aliasLog = [];
				element.addEventListener("valuechange", e =>
					aliasLog.push([e.name, e.oldValue, e.value]));
				await flush();
				let propschangeCountBefore = propsEvents.length;

				element.props.paused = true;
				element.v = 2;
				element.v = 3;
				element.props.paused = false;

				await flush();
				element.remove();
				return {
					alias: aliasLog,
					propschange: propsEvents.slice(propschangeCountBefore),
				};
			},
			expect: {
				alias: [["v", 1, 3]],
				propschange: [[["v", 1]]],
			},
		},
	],
};

import shadowPlugin from "../../../src/plugins/shadow/index.js";
import { defineElement } from "../../util/dom.js";
import { symbols } from "xtensible";

const { shadowRoot } = symbols.known;

const declarative = `<template shadowrootmode="open"><p>From HTML</p></template>`;

export default {
	name: "Shadow plugin",

	tests: [
		{
			name: "Declarative root",

			// The element is parsed and then upgraded, so the root exists before the constructor runs
			beforeEach () {
				let tag = defineElement({ plugins: [shadowPlugin] });
				let container = document.createElement("div");
				container.setHTMLUnsafe(`<${tag}>${declarative}</${tag}>`);
				this.data.element = container.firstElementChild;
			},

			tests: [
				{
					name: "attachShadow() keeps its content (issue #139)",
					run () {
						return this.data.element.attachShadow({ mode: "open" }).innerHTML;
					},
					expect: "<p>From HTML</p>",
				},
				{
					name: "The symbol returns the declarative root with its content",
					run () {
						return this.data.element[shadowRoot].innerHTML;
					},
					expect: "<p>From HTML</p>",
				},
				{
					name: "attachShadow() in another mode fails, as the native one does",
					description:
						"The native method throws NotSupportedError, which the plugin turns into null.",
					run () {
						return this.data.element.attachShadow({ mode: "closed" });
					},
					expect: null,
				},
				{
					name: "shadow-attached fires once",
					description:
						"Neither a repeated attachShadow() nor the lazy symbol fires it again.",
					run () {
						let { element } = this.data;
						let attached = 0;
						element.constructor.hooks.add("shadow-attached", () => attached++);

						element.attachShadow({ mode: "open" });
						element.attachShadow({ mode: "open" });
						element[shadowRoot];

						return attached;
					},
					expect: 1,
				},
			],
		},
		{
			name: "shadow-attached fires once for a root the plugin creates",
			description: "The path of every element without a declarative root.",
			run () {
				let element = document.createElement(defineElement({ plugins: [shadowPlugin] }));
				let attached = 0;
				element.constructor.hooks.add("shadow-attached", () => attached++);

				element.attachShadow({ mode: "open" });
				element.attachShadow({ mode: "open" });
				element[shadowRoot];

				return attached;
			},
			expect: 1,
		},
		{
			name: "A subclass that exposes the symbol as shadowRoot keeps the declarative content",
			description:
				"The override reads the symbol, whose lazy getter calls attachShadow(). " +
				"If attachShadow() read the override, it would re-enter itself.",
			run () {
				let tag = defineElement({
					plugins: [shadowPlugin],
					mixin (Class) {
						Object.defineProperty(Class.prototype, "shadowRoot", {
							get () {
								return this[shadowRoot];
							},
						});
					},
				});
				let container = document.createElement("div");
				container.setHTMLUnsafe(`<${tag}>${declarative}</${tag}>`);

				return container.firstElementChild.attachShadow({ mode: "open" }).innerHTML;
			},
			expect: "<p>From HTML</p>",
		},
	],
};

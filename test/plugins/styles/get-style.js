import { getStyle } from "../../../src/plugins/styles/util/get-style.js";

// Browser globals mock (CSSStyleSheet is not available in Node)
globalThis.CSSStyleSheet ??= class CSSStyleSheet {
	// cssToSheet() calls this to populate the sheet
	replaceSync () {}
};

// Prevent real network requests from URL-based code paths
globalThis.fetch = () => Promise.resolve({ text: () => Promise.resolve("") });

let sheet = new CSSStyleSheet();

export default {
	name: "getStyle()",
	run (arg, defaults) {
		return getStyle(arg, "https://example.com/", defaults);
	},
	// Only assert properties we care about
	check: { subset: true, deep: true },
	tests: [
		{
			name: "Non-promise values",
			tests: [
				{
					name: "CSSStyleSheet",
					arg: sheet,
					expect: { css: sheet },
				},
				{
					name: "String",
					arg: "styles.css",
					expect: { url: "styles.css", fullUrl: "https://example.com/styles.css" },
				},
				{
					name: "URL",
					arg: new URL("https://example.com/styles.css"),
					expect: {
						url: "https://example.com/styles.css",
						fullUrl: "https://example.com/styles.css",
					},
				},
				{
					name: "Options dict with string url",
					arg: { url: "styles.css" },
					expect: { url: "styles.css", fullUrl: "https://example.com/styles.css" },
				},
				{
					name: "Options dict with URL coercion",
					arg: { url: new URL("https://example.com/styles.css"), media: "screen" },
					expect: {
						url: "https://example.com/styles.css",
						fullUrl: "https://example.com/styles.css",
						media: "screen",
					},
				},
				{
					name: "Options dict with CSS string",
					arg: { css: "body { color: red }" },
					check: actual => actual.css instanceof CSSStyleSheet,
				},
				{
					name: "Explicit css not overwritten by URL fetch",
					arg: { url: "styles.css", css: sheet },
					expect: { css: sheet, fullUrl: "https://example.com/styles.css" },
				},
				{
					name: "Defaults merged",
					args: [sheet, { shadow: true }],
					expect: { css: sheet, shadow: true },
				},
			],
		},
		{
			name: "Promise-wrapped values",
			check: async actual => (await actual.css) instanceof CSSStyleSheet,
			tests: [
				{
					name: "CSSStyleSheet",
					arg: Promise.resolve(sheet),
				},
				{
					name: "ESM default (dynamic import)",
					arg: import("data:text/javascript,export default new CSSStyleSheet()"),
				},
			],
		},
	],
};

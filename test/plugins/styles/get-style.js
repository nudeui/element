import { getStyle } from "../../../src/plugins/styles/util/get-style.js";

// Browser globals mock
globalThis.CSSStyleSheet ??= class CSSStyleSheet {};
globalThis.fetch = url =>
	Promise.resolve({
		text: () => Promise.resolve(`/* fetched: ${url} */`),
	});

let sheet = new CSSStyleSheet();

export default {
	name: "getStyle()",
	run: getStyle,
	tests: [
		{
			name: "String",
			arg: "styles.css",
			expect: { url: "styles.css" },
		},
		{
			name: "URL",
			arg: new URL("https://example.com/styles.css"),
			expect: { url: "https://example.com/styles.css" },
		},
		{
			name: "CSSStyleSheet",
			arg: sheet,
			expect: { css: sheet },
		},
		{
			name: "ESM default unwrapping",
			arg: { default: "styles.css" },
			expect: { url: "styles.css" },
		},
		{
			name: "Options dict with URL coercion",
			arg: { url: new URL("https://example.com/styles.css"), media: "screen" },
			expect: { url: "https://example.com/styles.css", media: "screen" },
		},
		{
			name: "Promise",
			async run (arg) {
				let result = getStyle(Promise.resolve(arg), "https://example.com/");
				return { css: await result.css };
			},
			tests: [
				{
					name: "resolving to CSSStyleSheet",
					arg: sheet,
					expect: { css: sheet },
				},
				{
					name: "resolving to string fetches URL",
					arg: "styles.css",
					expect: { css: "/* fetched: https://example.com/styles.css */" },
				},
				{
					name: "unwraps ESM default",
					arg: { default: sheet },
					expect: { css: sheet },
				},
			],
		},
	],
};

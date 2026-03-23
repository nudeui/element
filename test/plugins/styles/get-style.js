import { getStyle, getStyleSync } from "../../../src/plugins/styles/util/get-style.js";

// Browser globals mock
globalThis.CSSStyleSheet ??= class CSSStyleSheet {
	replaceSync (css) {
		this._css = css;
	}
};

globalThis.fetch = url =>
	Promise.resolve({
		text: () => Promise.resolve(`/* fetched: ${url} */`),
	});

let sheet = new CSSStyleSheet();

export default {
	name: "Style normalization",
	tests: [
		{
			name: "getStyleSync()",
			run: getStyleSync,
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
					name: "Defaults merged",
					args: ["styles.css", { shadow: true }],
					expect: { url: "styles.css", shadow: true },
				},
			],
		},
		{
			name: "getStyle()",
			async run (arg) {
				let result = getStyle(Promise.resolve(arg), "https://example.com/");
				return { css: await result.css };
			},
			// Mock's replaceSync stores CSS text in _css; extract it for comparison
			map (result) {
				if (result?.css?._css) {
					return { ...result, css: result.css._css };
				}
				return result;
			},
			tests: [
				{
					name: "resolving to CSSStyleSheet",
					arg: sheet,
					expect: { css: sheet },
				},
				{
					name: "resolving to string fetches URL as CSSStyleSheet",
					arg: "styles.css",
					expect: { css: "/* fetched: https://example.com/styles.css */" },
				},
				{
					name: "unwraps ESM default",
					arg: { default: sheet },
					expect: { css: sheet },
				},
				{
					name: "Defaults merged",
					async run (arg) {
						let result = getStyle(Promise.resolve(arg), "https://example.com/", { shadow: true });
						return { css: await result.css, shadow: result.shadow };
					},
					arg: sheet,
					expect: { css: sheet, shadow: true },
				},
			],
		},
	],
};

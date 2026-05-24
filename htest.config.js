export default {
	setup: { src: "test/polyfills/dom.js", loadIf: typeof HTMLElement === "undefined" },
};

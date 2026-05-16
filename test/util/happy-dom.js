// No-op in the browser; registers happy-dom globally in Node.

let nativeCustomEvent;

if (typeof HTMLElement === "undefined") {
	const { GlobalRegistrator } = await import("@happy-dom/global-registrator");

	let nativeEvent = globalThis.Event;
	let nativeEventTarget = globalThis.EventTarget;
	nativeCustomEvent = globalThis.CustomEvent;

	GlobalRegistrator.register();

	// hTest's runner was built against the native Event classes (it loads
	// before happy-dom registers). Restore them so hTest keeps working —
	// happy-dom's own DOM classes hold internal references, so element
	// dispatch is unaffected.
	globalThis.Event = nativeEvent;
	globalThis.EventTarget = nativeEventTarget;
}

// CustomEvent is split: PropChangeEvent `extends CustomEvent` at load time and
// is dispatched on happy-dom elements (needs happy-dom's); hTest constructs
// `new CustomEvent` at runtime (needs native). test/index.js calls this once
// every import has resolved.
export function restoreNativeCustomEvent () {
	if (nativeCustomEvent) {
		globalThis.CustomEvent = nativeCustomEvent;
	}
}

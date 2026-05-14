import { GlobalRegistrator } from "@happy-dom/global-registrator";

// Must have no other imports: this file has to fully evaluate before any `src/`
// module loads, so `HTMLElement` / `customElements` / `document` are global by then.

const {
	Event: NativeEvent,
	EventTarget: NativeEventTarget,
	CustomEvent: NativeCustomEvent,
} = globalThis;

GlobalRegistrator.register();

// hTest's runner was built against the native Event classes (it loads before
// happy-dom registers). Restore them so hTest keeps working — happy-dom's own
// DOM classes hold internal references, so element dispatch is unaffected.
globalThis.Event = NativeEvent;
globalThis.EventTarget = NativeEventTarget;

// CustomEvent is split: PropChangeEvent `extends CustomEvent` at load time and
// is dispatched on happy-dom elements (needs happy-dom's); hTest constructs
// `new CustomEvent` at runtime (needs native). test/index.js calls this once
// every import has resolved.
export function restoreNativeCustomEvent () {
	globalThis.CustomEvent = NativeCustomEvent;
}

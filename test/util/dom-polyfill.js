import { GlobalRegistrator } from "@happy-dom/global-registrator";

// Keep this the only import. Adding more — or any top-level await — could let
// user modules evaluate before our DOM globals are registered.

const {
	Event: NativeEvent,
	EventTarget: NativeEventTarget,
	CustomEvent: NativeCustomEvent,
} = globalThis;

GlobalRegistrator.register();

// `register()` overwrote these globals with happy-dom's versions, but hTest
// already loaded and its classes extend whatever Event/EventTarget were global
// at the time. Put the natives back so hTest's own dispatch keeps working;
// happy-dom's DOM holds internal refs to its Event hierarchy, so it's
// unaffected by the swap-back.
globalThis.Event = NativeEvent;
globalThis.EventTarget = NativeEventTarget;

// CustomEvent is split-use. PropChangeEvent (src/) does `extends CustomEvent`
// at module-load and is dispatched on happy-dom elements — must extend
// happy-dom's. hTest later constructs `new CustomEvent` and dispatches on its
// own native EventTargets — needs native. The microtask defers the swap past
// synchronous module evaluation: by the time it fires, every `extends
// CustomEvent` has captured happy-dom's reference; hTest's runtime calls
// come later.
queueMicrotask(() => {
	globalThis.CustomEvent = NativeCustomEvent;
});

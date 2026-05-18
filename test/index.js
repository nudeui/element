// Let happy-dom finish registering before the test tree's src/ imports load
// (PropChangeEvent `extends CustomEvent` at module-eval time, needs happy-dom's).
import { restoreNativeCustomEvent } from "./util/happy-dom.js";

const { default: tests } = await import("./index-fn.js");

restoreNativeCustomEvent();

export default tests;

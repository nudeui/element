// Evaluating happy-dom.js registers the DOM globals src/ needs — must stay the first import.
import { restoreNativeCustomEvent } from "./util/happy-dom.js";
import Prop from "./Prop.js";
import Props from "./Props.js";
import hooks from "./hooks.js";
import split from "./split.js";
import plugins from "./plugins/index.js";

// Must stay below the imports above — see test/util/happy-dom.js for why the timing matters.
restoreNativeCustomEvent();

export default {
	name: "All tests",
	tests: [Prop, Props, hooks, split, plugins],
};

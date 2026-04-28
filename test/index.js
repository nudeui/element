import Prop from "./Prop.js";
import Props from "./Props.js";
import hooks from "./hooks.js";
import signals from "./signals.js";
import split from "./split.js";
import plugins from "./plugins/index.js";

export default {
	name: "All tests",
	tests: [Prop, Props, hooks, signals, split, plugins],
};

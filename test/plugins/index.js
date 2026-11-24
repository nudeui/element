import props from "./props/index.js";
import events from "./events/index.js";
import styles from "./styles/index.js";
import shadow from "./shadow/index.js";

export default {
	name: "Plugins",
	tests: [props, events, styles, shadow],
};

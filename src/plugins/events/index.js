import events from "./base.js";
import propchange from "./propchange.js";
import onprops from "./onprops.js";
import retarget from "./retarget.js";

export {
	events,
	onprops,
	propchange,
	retarget,
};

export default {
	dependencies: [
		events,
		onprops,
		propchange,
		retarget,
	],
};

import base from "./base.js";
import like from "./like.js";
import delegate from "./delegate.js";

export { base, like, delegate };

export const dependencies = [
	base,
	like,
	delegate,
];

export default {dependencies};

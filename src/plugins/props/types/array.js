import PropType from "../util/PropType.js";
import Iterable from "./iterable.js";

export default PropType.register({
	is: Array,
	extends: Iterable,
});

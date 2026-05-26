// Side-effect imports register the built-in types' singletons.
import "./basic.js";
import "./iterable.js";
import "./array.js";
import "./set.js";
import "./map.js";
import "./object.js";

export { default as PropType } from "../util/PropType.js";
export { default as Iterable } from "./iterable.js";

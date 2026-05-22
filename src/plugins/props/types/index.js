// Side-effect imports register the built-in types' singletons.
import "./basic.js";
import "./lists.js";
import "./dictionaries.js";

export { default as PropType } from "../util/PropType.js";
export { default as ListType } from "../util/ListType.js";
export { default as DictionaryType } from "../util/DictionaryType.js";

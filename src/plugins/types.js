/**
 * Public, named singletons for the built-in {@link PropType} instances.
 *
 * Exported under the corresponding JS constructor names so consumers can write:
 * `import * as Types from "nude-element/plugins/types"; Types.Array, Types.Map, ...`
 */

export { ArrayType as Array, SetType as Set } from "./props/types/lists.js";
export { ObjectType as Object, MapType as Map } from "./props/types/dictionaries.js";

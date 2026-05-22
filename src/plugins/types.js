/**
 * Public, named singletons for the built-in {@link PropType} instances.
 *
 * Exported under the corresponding JS constructor names so consumers can write:
 * `import * as Types from "nude-element/plugins/types"; Types.Array, Types.Map, ...`
 */

export { default as Array } from "./props/types/array.js";
export { default as Set } from "./props/types/set.js";
export { default as Object } from "./props/types/object.js";
export { default as Map } from "./props/types/map.js";

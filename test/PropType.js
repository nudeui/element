import PropType from "../src/plugins/props/util/PropType.js";
import Iterable from "../src/plugins/props/types/iterable.js";
// Side-effect imports register the built-in types.
import "../src/plugins/props/types/index.js";
import ArrayType from "../src/plugins/props/types/array.js";
import SetType from "../src/plugins/props/types/set.js";
import ObjectType from "../src/plugins/props/types/object.js";
import MapType from "../src/plugins/props/types/map.js";

const NumberType = PropType.for(Number);
const StringType = PropType.for(String);

export default {
	name: "PropType",
	tests: [
		{
			name: "for() — pure lookup returns the registered singleton",
			tests: [
				{
					name: "By constructor",
					run: () => PropType.for(Array) === ArrayType,
					expect: true,
				},
				{
					name: "By global name string",
					run: () => PropType.for("Array") === ArrayType,
					expect: true,
				},
				{
					name: "By bare spec {is: ctor}",
					run: () => PropType.for({ is: Array }) === ArrayType,
					expect: true,
				},
				{
					name: "By bare spec {is: 'name'}",
					run: () => PropType.for({ is: "Array" }) === ArrayType,
					expect: true,
				},
				{
					name: "PropType instance passes through",
					run: () => PropType.for(ArrayType) === ArrayType,
					expect: true,
				},
				{
					name: "Lookup is idempotent across calls",
					run: () => PropType.for(Array) === PropType.for(Array),
					expect: true,
				},
				{
					name: "undefined yields a fallback that is a PropType",
					run: () => PropType.for(undefined) instanceof PropType,
					expect: true,
				},
				{
					name: "null yields the same fallback as undefined",
					run: () => PropType.for(undefined) === PropType.for(null),
					expect: true,
				},
				{
					name: "Custom fallback honored",
					run: () => PropType.for(undefined, { fallback: ArrayType }) === ArrayType,
					expect: true,
				},
				{
					name: "Unregistered constructor yields the default fallback",
					run () {
						class Unknown {}
						return PropType.for(Unknown) === PropType.for(undefined);
					},
					expect: true,
				},
				{
					name: "Built-in singletons match their named exports",
					run: () =>
						PropType.for(Array) === ArrayType
						&& PropType.for(Set) === SetType
						&& PropType.for(Object) === ObjectType
						&& PropType.for(Map) === MapType,
					expect: true,
				},
			],
		},
		{
			name: "Derivation",
			tests: [
				{
					name: "Specs with options produce a fresh instance, not the singleton",
					run: () => PropType.for({ is: Array, values: Number }) !== ArrayType,
					expect: true,
				},
				{
					name: "Derivative inherits from its abstract base type",
					run: () => PropType.for({ is: Array, values: Number }).isA(Iterable),
					expect: true,
				},
				{
					name: "Derivative reports the correct is",
					run: () => PropType.for({ is: Array, values: Number }).is === Array,
					expect: true,
				},
				{
					name: "Nested option specs resolve to PropType instances",
					run () {
						let t = PropType.for({ is: Array, values: Number });
						return t.values === NumberType;
					},
					expect: true,
				},
				{
					name: "No caching: repeated calls yield distinct derivatives",
					run () {
						let t1 = PropType.for({ is: Array, values: Number });
						let t2 = PropType.for({ is: Array, values: Number });
						return t1 !== t2;
					},
					expect: true,
				},
				{
					name: "But nested singletons are shared across calls",
					run () {
						let t1 = PropType.for({ is: Array, values: Number });
						let t2 = PropType.for({ is: Array, values: Number });
						return t1.values === t2.values;
					},
					expect: true,
				},
				{
					name: "Mutating a derivative does not affect the singleton",
					run () {
						let t = PropType.for({ is: Array, values: Number });
						t.separator = ";";
						return ArrayType.separator;
					},
					expect: undefined,
				},
				{
					name: "Method override is used in dispatch",
					run () {
						let t = PropType.for({ is: Array, equals: () => "called" });
						return t.equals([1], [1, 2]);
					},
					expect: "called",
				},
				{
					name: "Non-overridden methods still come from the parent",
					run () {
						let t = PropType.for({ is: Array, equals: () => false });
						return t.parse("a, b, c");
					},
					expect: ["a", "b", "c"],
				},
				{
					name: "Non-overridden stringify still comes from the parent",
					run () {
						let t = PropType.for({ is: Array, equals: () => false });
						return t.stringify(["a", "b", "c"]);
					},
					expect: "a, b, c",
				},
			],
		},
		{
			name: "Default method behavior",
			tests: [
				{
					name: "parse passes null through",
					run: () => PropType.for(Array).parse(null),
					expect: null,
				},
				{
					name: "parse passes undefined through",
					run: () => PropType.for(Array).parse(undefined),
					expect: undefined,
				},
				{
					name: "stringify returns null for null",
					run: () => PropType.for(Array).stringify(null),
					expect: null,
				},
				{
					name: "stringify returns null for undefined",
					run: () => PropType.for(Array).stringify(undefined),
					expect: null,
				},
				{
					name: "equals: null vs null is true",
					run: () => PropType.for(Array).equals(null, null),
					expect: true,
				},
				{
					name: "equals: null vs undefined is false",
					run: () => PropType.for(Array).equals(null, undefined),
					expect: false,
				},
				{
					name: "equals: identity short-circuit",
					run () {
						let a = [1, 2];
						return PropType.for(Array).equals(a, a);
					},
					expect: true,
				},
			],
		},
		{
			name: "List behavior",
			tests: [
				{
					name: "Array<Number> parses comma-separated string",
					run () {
						return PropType.for({ is: Array, values: Number }).parse("1, 2, 3");
					},
					expect: [1, 2, 3],
				},
				{
					name: "Array<Number> stringifies",
					run () {
						return PropType.for({ is: Array, values: Number }).stringify([1, 2, 3]);
					},
					expect: "1, 2, 3",
				},
				{
					name: "Array<Number> equality with matching contents",
					run () {
						let t = PropType.for({ is: Array, values: Number });
						return t.equals([1, 2, 3], [1, 2, 3]);
					},
					expect: true,
				},
				{
					name: "Array<Number> equality with different length",
					run () {
						let t = PropType.for({ is: Array, values: Number });
						return t.equals([1, 2], [1, 2, 3]);
					},
					expect: false,
				},
				{
					name: "Set<Number> parses to a Set instance",
					run () {
						let result = PropType.for({ is: Set, values: Number }).parse("1, 2, 3");
						return result instanceof Set && [...result].join(",");
					},
					expect: "1,2,3",
				},
				{
					name: "Derivative with custom separator parses with it",
					run () {
						return PropType.for({ is: Array, values: Number, separator: ";" }).parse("1; 2; 3");
					},
					expect: [1, 2, 3],
				},
				{
					name: "Derivative with custom separator stringifies with it (no auto-spacing)",
					run () {
						return PropType.for({ is: Array, values: Number, separator: ";" }).stringify([1, 2, 3]);
					},
					expect: "1;2;3",
				},
				{
					name: "Derivative with custom joiner stringifies with it",
					run () {
						return PropType.for({ is: Array, values: Number, joiner: " " }).stringify([1, 2, 3]);
					},
					expect: "1 2 3",
				},
				{
					name: "Derivative without `values` still respects separator",
					run () {
						return PropType.for({ is: Array, separator: ";" }).parse("a; b; c");
					},
					expect: ["a", "b", "c"],
				},
			],
		},
		{
			name: "Dictionary behavior",
			tests: [
				{
					name: "Object<String, Number> parses microsyntax",
					run () {
						return PropType.for({ is: Object, keys: String, values: Number }).parse("a: 1, b: 2");
					},
					expect: { a: 1, b: 2 },
				},
				{
					name: "Map<String, Number> parses to a Map with correct entries",
					run () {
						let m = PropType.for({ is: Map, keys: String, values: Number }).parse("a: 1, b: 2");
						return [m instanceof Map, m.get("a"), m.get("b")];
					},
					expect: [true, 1, 2],
				},
				{
					name: "Nested key and value types are resolved",
					run () {
						let t = PropType.for({ is: Map, keys: String, values: Number });
						return t.keys === StringType && t.values === NumberType;
					},
					expect: true,
				},
				{
					name: "Derivative with custom separator parses with it",
					run () {
						return PropType.for({ is: Object, keys: String, values: Number, separator: ";" }).parse("a: 1; b: 2");
					},
					expect: { a: 1, b: 2 },
				},
				{
					name: "Derivative with custom separator stringifies with it",
					run () {
						return PropType.for({ is: Object, keys: String, values: Number, separator: " | " }).stringify({ a: 1, b: 2 });
					},
					expect: "a: 1 | b: 2",
				},
				{
					name: "Derivative with defaultValue uses it for valueless entries",
					run () {
						return PropType.for({ is: Object, defaultValue: 7 }).parse("a, b, c");
					},
					expect: { a: 7, b: 7, c: 7 },
				},
				{
					name: "Derivative with defaultKey uses it for keyless entries",
					run () {
						return PropType.for({ is: Object, defaultKey: (v, i) => i }).parse("a, b, c");
					},
					expect: { 0: "a", 1: "b", 2: "c" },
				},
			],
		},
		{
			name: "Nested type composition",
			tests: [
				{
					name: "Array<Array<Number>> — inner type is resolved correctly",
					run () {
						let t = PropType.for({
							is: Array,
							values: { is: Array, values: Number },
						});
						return t.values.isA(Iterable)
							&& t.values.is === Array
							&& t.values.values === NumberType;
					},
					expect: true,
				},
				{
					name: "Array<Set<Number>> — inner type is the SetType derivative",
					run () {
						let t = PropType.for({
							is: Array,
							values: { is: Set, values: Number },
						});
						return t.values.isA(Iterable)
							&& t.values.is === Set;
					},
					expect: true,
				},
			],
		},
		{
			name: "Built-in primitives",
			tests: [
				{
					name: "Boolean.parse(null) → null",
					run: () => PropType.for(Boolean).parse(null),
					expect: null,
				},
				{
					name: "Boolean.parse(any non-null) → true",
					run: () => PropType.for(Boolean).parse("anything"),
					expect: true,
				},
				{
					name: "Boolean.stringify(true) → empty string",
					run: () => PropType.for(Boolean).stringify(true),
					expect: "",
				},
				{
					name: "Boolean.stringify(false) → null",
					run: () => PropType.for(Boolean).stringify(false),
					expect: null,
				},
				{
					name: "Number.parse coerces string",
					run: () => PropType.for(Number).parse("42"),
					expect: 42,
				},
				{
					name: "Number.equals: NaN === NaN",
					run: () => PropType.for(Number).equals(NaN, NaN),
					expect: true,
				},
				{
					name: "Number.equals: 1 vs 2 false",
					run: () => PropType.for(Number).equals(1, 2),
					expect: false,
				},
				{
					name: "Function singleton parses zero-arg body",
					run () {
						return PropType.for(Function).parse("return 7")();
					},
					expect: 7,
				},
				{
					name: "Function derivative with arguments parses correctly",
					run () {
						let t = PropType.for({ is: Function, arguments: ["x"] });
						return t.parse("return x * 2")(5);
					},
					expect: 10,
				},
				{
					name: "Function stringify throws",
					run () {
						try {
							PropType.for(Function).stringify(() => {});
							return "no throw";
						}
						catch (e) {
							return e instanceof TypeError;
						}
					},
					expect: true,
				},
			],
		},
		{
			name: "register()",
			tests: [
				{
					name: "After register, for() returns the registered instance",
					run () {
						class Foo {}
						let registered = PropType.register({ is: Foo });
						let result = PropType.for(Foo) === registered;
						PropType.registry.delete(Foo);
						return result;
					},
					expect: true,
				},
				{
					name: "register with extends: Iterable produces an Iterable derivative",
					run () {
						class FooList {}
						let t = PropType.register({ is: FooList, extends: Iterable });
						let result = t.isA(Iterable);
						PropType.registry.delete(FooList);
						return result;
					},
					expect: true,
				},
				{
					name: "register with extends: MapType produces a Map derivative",
					run () {
						class FooDict {}
						let t = PropType.register({ is: FooDict, extends: MapType });
						let result = t.isA(MapType);
						PropType.registry.delete(FooDict);
						return result;
					},
					expect: true,
				},
				{
					name: "Registered parse is actually invoked",
					run () {
						class Foo {}
						PropType.register({ is: Foo, parse: () => "parsed!" });
						let result = PropType.for(Foo).parse("anything");
						PropType.registry.delete(Foo);
						return result;
					},
					expect: "parsed!",
				},
			],
		},
	],
};

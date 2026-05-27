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

// Stand-in for any custom class a user might pass as `type` without registering
// it (the README's Color.js example). Constructs from a string, has its own
// toString and equals — enough to exercise the default parse/stringify/equals.
class Unknown {
	constructor (value) {
		this.value = value instanceof Unknown ? value.value : String(value);
	}
	toString () {
		return this.value;
	}
	equals (other) {
		return other instanceof Unknown && other.value === this.value;
	}
}

export default {
	name: "PropType",
	expect: ArrayType,
	tests: [
		{
			name: "for() — pure lookup returns the registered singleton",
			run: input => PropType.for(input),
			tests: [
				{ name: "By constructor", arg: Array },
				{ name: "By global name string", arg: "Array" },
				{ name: "By bare spec {is: ctor}", arg: { is: Array } },
				{ name: "By bare spec {is: 'name'}", arg: { is: "Array" } },
				{ name: "PropType instance passes through", arg: ArrayType },
				{
					name: "Lookup is idempotent across calls",
					check: () => PropType.for(Array) === PropType.for(Array),
				},
				{
					name: "undefined yields a fallback that is a PropType",
					check: () => PropType.for(undefined) instanceof PropType,
				},
				{
					name: "null yields the same fallback as undefined",
					arg: null,
					expect: PropType.for(undefined),
				},
				{
					name: "Custom fallback honored",
					run: () => PropType.for(undefined, { fallback: ArrayType }),
				},
				{
					name: "Unregistered constructor yields a derivative carrying its `is`",
					check () {
						let t = PropType.for(Unknown);
						return t instanceof PropType && t !== PropType.any && t.is === Unknown;
					},
				},
				{
					name: "Unregistered constructor lookup is idempotent across calls",
					check: () => PropType.for(Unknown) === PropType.for(Unknown),
				},
				{
					name: "Bare spec {is: X} is idempotent across calls",
					check () {
						class Fresh {}
						return PropType.for({ is: Fresh }) === PropType.for({ is: Fresh });
					},
				},
				{
					name: "Constructor and bare spec forms resolve to the same instance",
					check () {
						class Cross {}
						return PropType.for({ is: Cross }) === PropType.for(Cross);
					},
				},
				{
					name: "Unresolvable string still yields the default fallback",
					check: () =>
						PropType.for("DefinitelyNotAGlobalOrRegisteredType") === PropType.for(undefined),
				},
				{
					name: "Built-in singletons match their named exports",
					check: () =>
						PropType.for(Array) === ArrayType &&
						PropType.for(Set) === SetType &&
						PropType.for(Object) === ObjectType &&
						PropType.for(Map) === MapType,
				},
			],
		},
		{
			name: "Derivation",
			tests: [
				{
					name: "Specs with options produce a fresh instance, not the singleton",
					check: () => PropType.for({ is: Array, values: Number }) !== ArrayType,
				},
				{
					name: "Derivative inherits from its abstract base type",
					check: () => PropType.for({ is: Array, values: Number }).isA(Iterable),
				},
				{
					name: "Derivative reports the correct is",
					check: () => PropType.for({ is: Array, values: Number }).is === Array,
				},
				{
					name: "Nested option specs resolve to PropType instances",
					check () {
						let t = PropType.for({ is: Array, values: Number });
						return t.values === NumberType;
					},
				},
				{
					name: "No caching: repeated calls yield distinct derivatives",
					check () {
						let t1 = PropType.for({ is: Array, values: Number });
						let t2 = PropType.for({ is: Array, values: Number });
						return t1 !== t2;
					},
				},
				{
					name: "But nested singletons are shared across calls",
					check () {
						let t1 = PropType.for({ is: Array, values: Number });
						let t2 = PropType.for({ is: Array, values: Number });
						return t1.values === t2.values;
					},
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
					check: () => PropType.for(Array).equals(null, null),
				},
				{
					name: "equals: null vs undefined is false",
					run: () => PropType.for(Array).equals(null, undefined),
					expect: false,
				},
				{
					name: "equals: identity short-circuit",
					check () {
						let a = [1, 2];
						return PropType.for(Array).equals(a, a);
					},
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
					check () {
						let t = PropType.for({ is: Array, values: Number });
						return t.equals([1, 2, 3], [1, 2, 3]);
					},
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
						return PropType.for({ is: Array, values: Number, separator: ";" }).parse(
							"1; 2; 3",
						);
					},
					expect: [1, 2, 3],
				},
				{
					name: "Derivative with custom separator stringifies with it (no auto-spacing)",
					run () {
						return PropType.for({
							is: Array,
							values: Number,
							separator: ";",
						}).stringify([1, 2, 3]);
					},
					expect: "1;2;3",
				},
				{
					name: "Derivative with custom joiner stringifies with it",
					run () {
						return PropType.for({ is: Array, values: Number, joiner: " " }).stringify([
							1, 2, 3,
						]);
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
						return PropType.for({ is: Object, keys: String, values: Number }).parse(
							"a: 1, b: 2",
						);
					},
					expect: { a: 1, b: 2 },
				},
				{
					name: "Map<String, Number> parses to a Map with correct entries",
					run () {
						let m = PropType.for({ is: Map, keys: String, values: Number }).parse(
							"a: 1, b: 2",
						);
						return [m instanceof Map, m.get("a"), m.get("b")];
					},
					expect: [true, 1, 2],
				},
				{
					name: "Nested key and value types are resolved",
					check () {
						let t = PropType.for({ is: Map, keys: String, values: Number });
						return t.keys === StringType && t.values === NumberType;
					},
				},
				{
					name: "Derivative with custom separator parses with it",
					run () {
						return PropType.for({
							is: Object,
							keys: String,
							values: Number,
							separator: ";",
						}).parse("a: 1; b: 2");
					},
					expect: { a: 1, b: 2 },
				},
				{
					name: "Derivative with custom separator stringifies with it",
					run () {
						return PropType.for({
							is: Object,
							keys: String,
							values: Number,
							separator: " | ",
						}).stringify({ a: 1, b: 2 });
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
						return PropType.for({ is: Object, defaultKey: (v, i) => i }).parse(
							"a, b, c",
						);
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
					check () {
						let t = PropType.for({
							is: Array,
							values: { is: Array, values: Number },
						});
						return (
							t.values.isA(Iterable) &&
							t.values.is === Array &&
							t.values.values === NumberType
						);
					},
				},
				{
					name: "Array<Set<Number>> — inner type is the SetType derivative",
					check () {
						let t = PropType.for({
							is: Array,
							values: { is: Set, values: Number },
						});
						return t.values.isA(Iterable) && t.values.is === Set;
					},
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
					check: () => PropType.for(Boolean).parse("anything"),
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
					check: () => PropType.for(Number).equals(NaN, NaN),
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
					check () {
						try {
							PropType.for(Function).stringify(() => {});
							return false;
						}
						catch (e) {
							return e instanceof TypeError;
						}
					},
				},
			],
		},
		{
			name: "Custom constructors without registration",
			tests: [
				{
					name: "parse(string) constructs an Unknown instance",
					check: () => PropType.for(Unknown).parse("red") instanceof Unknown,
				},
				{
					name: "parse(string) preserves the value",
					run: () => PropType.for(Unknown).parse("red").toString(),
					expect: "red",
				},
				{
					name: "parse passes through existing Unknown instances",
					check () {
						let c = new Unknown("red");
						return PropType.for(Unknown).parse(c) === c;
					},
				},
				{
					name: "stringify uses Unknown#toString",
					run: () => PropType.for(Unknown).stringify(new Unknown("blue")),
					expect: "blue",
				},
				{
					name: "equals uses Unknown#equals for distinct-but-equal instances",
					check: () =>
						PropType.for(Unknown).equals(
							new Unknown("red"),
							new Unknown("red"),
						),
				},
				{
					name: "equals returns false for different Unknown instances",
					run: () =>
						PropType.for(Unknown).equals(
							new Unknown("red"),
							new Unknown("blue"),
						),
					expect: false,
				},
			],
		},
		{
			name: "super",
			tests: [
				{
					name: "super.X returns parent's data even when child overrides it",
					check () {
						class Box {}
						PropType.register({ is: Box, hint: "from-parent" });
						let child = PropType.for({ is: Box, hint: "from-child" });
						let result = child.super.hint === "from-parent" && child.hint === "from-child";
						PropType.registry.delete(Box);
						return result;
					},
				},
				{
					name: "super.method() runs parent's method with this = self",
					check () {
						class Box {}
						let calledWith;
						PropType.register({
							is: Box,
							parse (value) {
								calledWith = this;
								return value;
							},
						});
						let child = PropType.for({ is: Box, other: "extra" });
						child.super.parse("anything");
						let result = calledWith === child;
						PropType.registry.delete(Box);
						return result;
					},
				},
				{
					name: "super.parse() does not recurse when called from a child's parse override",
					run () {
						class Box {}
						PropType.register({
							is: Box,
							parse: value => "parent:" + value,
						});
						let child = PropType.for({
							is: Box,
							parse (value) {
								return "child(" + this.super.parse(value) + ")";
							},
						});
						let result = child.parse("hi");
						PropType.registry.delete(Box);
						return result;
					},
					expect: "child(parent:hi)",
				},
			],
		},
		{
			name: "register()",
			tests: [
				{
					name: "After register, for() returns the registered instance",
					check () {
						class Foo {}
						let registered = PropType.register({ is: Foo });
						let result = PropType.for(Foo) === registered;
						PropType.registry.delete(Foo);
						return result;
					},
				},
				{
					name: "register with extends: Iterable produces an Iterable derivative",
					check () {
						class FooList {}
						let t = PropType.register({ is: FooList, extends: Iterable });
						let result = t.isA(Iterable);
						PropType.registry.delete(FooList);
						return result;
					},
				},
				{
					name: "register with extends: MapType produces a Map derivative",
					check () {
						class FooDict {}
						let t = PropType.register({ is: FooDict, extends: MapType });
						let result = t.isA(MapType);
						PropType.registry.delete(FooDict);
						return result;
					},
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

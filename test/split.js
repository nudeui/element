import { split } from "../src/props/types/util.js";

export default {
	name: "split()",
	run: split,
	tests: [
		{
			name: "Basic",
			arg: "a, b, c",
			expect: ["a", "b", "c"],
		},
		{
			name: "Whitespace",
			arg: "	a  ,   b  ,c	",
			expect: ["a", "b", "c"],
		},
		{
			name: "Parens",
			arg: "(a, b), c, d",
			expect: ["(a, b)", "c", "d"],
		},
		{
			name: "Parens + quotes",
			arg: "(a, 'b), c', d), e",
			expect: ["(a, 'b), c', d)", "e"],
		},
		{
			name: "Nested quotes",
			arg: `a ", 'b, c', d", e`,
			expect: [`a ", 'b, c', d"`, "e"],
		},
		{
			name: "Unterminated parens",
			arg: "(a, b, c",
			expect: ["(a", "b", "c"],
		},
		{
			name: "Extra parens",
			arg: "a), b), c)",
			expect: ["a)", "b)", "c)"],
		},
		{
			name: "Interleaved nested pairs",
			arg: "{a, (b, c}, d), e",
			expect: ["{a, (b, c}, d)", "e"],
		},
		{
			name: "Unterminated quotes",
			arg: `a ", b, c`,
			expect: [`a "`, "b", "c"],
		},
	],
};

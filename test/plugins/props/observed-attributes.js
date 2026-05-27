import { default as propsPlugin } from "../../../src/plugins/props/base.js";
import { defineElement } from "../../util/dom.js";

export default {
	name: "observedAttributes",
	run (props) {
		let tag = defineElement({ plugins: [propsPlugin], props });
		return customElements.get(tag).observedAttributes;
	},
	tests: [
		{
			name: "No props === no observed attributes",
			arg: {},
			expect: [],
		},
		{
			name: "Observed attributes correspond to reflected props",
			arg: {
				foo: {},
				bar: {
					reflect: false,
				},
				baz: {
					reflect: { from: "yolo" },
				},
				foobar: {
					reflect: "foo",
				},
			},
			expect: ["foo", "yolo"],
		},
		{
			name: "Props reflecting from an empty string should be ignored",
			arg: {
				foo: {
					reflect: "",
				},
			},
			expect: [],
		},
	],
};

const { restoreNativeCustomEvent } = await import("./util/happy-dom.js");

let tests = ["./Prop.js", "./Props.js", "./hooks.js", "./split.js", "./plugins/index.js"];
tests = (await Promise.all(tests.map(p => import(p)))).map(m => m.default);

restoreNativeCustomEvent();

export default {
	name: "All tests",
	tests,
};

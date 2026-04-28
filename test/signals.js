import { Signal, Computed } from "../src/signals.js";

export default {
	name: "Signals",
	tests: [
		{
			name: "Signal honors { equals } option",
			run () {
				let signal = new Signal(0, { equals: () => true });
				let calls = 0;
				signal.subscribe(() => calls++);
				signal.value = 1;
				return calls;
			},
			expect: 0,
		},
		{
			name: "Computed honors { equals } option",
			async run () {
				let dep = new Signal(0);
				let computed = new Computed(() => dep.value, { equals: () => true });
				computed.value;

				let calls = 0;
				computed.subscribe(() => calls++);
				dep.value = 5;
				await Promise.resolve();
				return calls;
			},
			expect: 0,
		},
	],
};

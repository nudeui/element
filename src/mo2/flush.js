import base from "./base.js";

export const dependencies = [base];

export const hooks = {
	disconnect () {
		this.flush();
	},
};

export const provides = {
	flush () {
		let records = this.takeRecords();
		if (records.length > 0) {
			this.constructor.callback(records, this);
		}
	},
};

export default { dependencies, hooks, provides };

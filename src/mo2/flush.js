import base from "./base.js";

const dependencies = [base];

const hooks = {
	disconnect () {
		this.flush();
	},
};

const provides = {
	flush () {
		let records = this.takeRecords();
		if (records.length > 0) {
			this.constructor.callback(records, this);
		}
	},
};

export default { dependencies, hooks, provides };

const eps = 10e-6;
const directions = ["top", "right", "bottom", "left"];

function pesLPOptim(grid, cols, rows) {
	let relationships = [];

	// Collect customer-vendor relationships
	for (let i = 0; i < cols; i++) {
		for (let j = 0; j < rows; j++) {
			directions.forEach((dir) => {
				if (grid[i][j][dir]) {
					let target = getTargetSquare(i, j, dir);
					if (target) {
						relationships.push({ customer: { i, j }, vendor: target });
					}
				}
			});
		}
	}

	// Shuffle relationships to ensure a random order
	shuffleArray(relationships);

	relationships.forEach((rel) => {
		let customerSquare = grid[rel.customer.i][rel.customer.j];
		let vendorSquare = grid[rel.vendor.i][rel.vendor.j];

		let payment = calculatePayment(customerSquare, vendorSquare);
		let cost = calculateCost(payment, customerSquare);

		// Check if the transaction should occur based on demand, cost, and available funds
		if (
			cost < customerSquare.demand &&
			payment.every((amount) => amount >= 0) &&
			customerSquare.currencyOne >= payment[0] &&
			customerSquare.currencyTwo >= payment[1]
		) {
			// Transaction occurs
			customerSquare.currencyOne -= payment[0];
			customerSquare.currencyTwo -= payment[1];
			vendorSquare.currencyOne += payment[0];
			vendorSquare.currencyTwo += payment[1];
		}
	});

	// Update valuations
	for (let i = 0; i < cols; i++) {
		for (let j = 0; j < rows; j++) {
			const me = grid[i][j];
			var constraintGenerator = new Map();

			// Determine inherited assessment
			const bestVendors = getBestVendors(grid, i, j);
			const inheritedAssessment = bestVendors[0].valuation;

			// Get constraint info for every customer
			directions.forEach((dir) => {
				if (me[dir]) {
					const customerCoords = getTargetSquare(i, j, dir);
					const customer = grid[customerCoords.i][customerCoords.j];

					constraintGenerator.set(customer, {});

					const competition = getBestVendors(
						grid,
						customerCoords.i,
						customerCoords.j,
					);
					const competitor = competition[0];
					constraintGenerator.get(customer).profitSplit =
						1 / (competition.length + 1);

					// NOTE: when demand can vary between vendors, this formula is more complicated
					const cutoff =
						(me.price / competitor.price) *
						(customer.currencyOne * competitor.valuation.currencyOne +
							customer.currencyTwo * competitor.valuation.currencyTwo);
					constraintGenerator.get(customer).cutoff = cutoff;
				}
			});

			// Generate LP matrices for every customer combo
			const customerCombos = getAllSubsets(
				Array.from(constraintGenerator.keys()),
			).filter((arr) => arr.length != 0);

			// Solve optimization problem for each customer
			var results = new Map();

			customerCombos.forEach((combo) => {
				// Calculate expected profit for combo
				// Profit is actually hyperbolic, but by minimizing 1/x we maximize x (assuming x > 0, which it should be)
				const objective = combo
					.map((customer) => {
						const profitScalar =
							me.price *
							(customer.currencyOne * inheritedAssessment.currencyOne +
								customer.currencyTwo * inheritedAssessment.currencyTwo) *
							constraintGenerator.get(customer).profitSplit;

						return [
							profitScalar / customer.currencyOne,
							profitScalar / customer.currencyTwo,
						];
					})
					.reduce(
						(acc, curr) => {
							return [acc[0] + curr[0], acc[1] + curr[1]];
						},
						[0, 0],
					)
					.map((val) => 1 / val);

				const constraintMat = combo.map((customer) => [
					-customer.currencyOne,
					-customer.currencyTwo,
				]);

				const constraintVec = combo.map(
					(customer) => -constraintGenerator.get(customer).cutoff,
				);

				// Solve generated LP
				// Library MINIMIZES objective * x, subject to constraintMat * x <= constraintVec
				const lp = numeric.solveLP(objective, constraintMat, constraintVec);
				results.set(combo, {});
				results.get(combo).optimAssessment = numeric.trunc(lp.solution, eps);
				results.get(combo).inverseProfit =
					lp.solution[0] * objective[0] + lp.solution[1] * objective[1];
			});

			// Set valuations to cause max profit (min inverse profit)
			const optimCombo = Array.from(results.entries()).reduce(
				(min, [key, value]) => {
					return value.inverseProfit < min[1]
						? [key, value.inverseProfit]
						: min;
				},
				[null, Infinity],
			)[0];

			if (optimCombo != null) {
				me.valuation.currencyOne = results.get(optimCombo).optimAssessment[0];
				me.valuation.currencyTwo = results.get(optimCombo).optimAssessment[1];
			} // else no set of valuations will make me profit
		}
	}
}

/**
 * @param {any} grid Grid of agents
 * @param {any} i Row coord of customer
 * @param {any} j Col coord of customer
 * @returns {} List of agent structs who are best vendors to given customer
 */
function getBestVendors(grid, i, j) {
	const customer = grid[i][j];
	const directions = ["top", "right", "bottom", "left"];
	var maxUtilScale = -Infinity;
	var bestVendors = [];

	// Loop through neighbors
	for (const dir of directions) {
		if (grid[i][j][dir]) {
			let target = getTargetSquare(i, j, dir);

			// Calculate util for every vendor
			if (target) {
				vendor = grid[target.i][target.j];
				const utilScale =
					(customer.currencyOne * vendor.valuation.currencyOne +
						customer.currencyTwo * vendor.valuation.currencyTwo) /
					vendor.price;
				// here, demand and wallet magnitude are constant for every vendor, unnecessary

				// Update highest util found
				if (utilScale > maxUtilScale) {
					bestVendors = [vendor];
					maxUtilScale = utilScale;
				} else if (maxUtilScale - utilScale < eps) {
					bestVendors.push(vendor);
				}
			}
		}
	}

	return bestVendors;
}

const getAllSubsets = (theArray) =>
	theArray.reduce(
		(subsets, value) => subsets.concat(subsets.map((set) => [value, ...set])),
		[[]],
	);

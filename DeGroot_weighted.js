function pesDeGrootWeighted(grid, cols, rows) {
	let relationships = [];
	const directions = ["top", "right", "bottom", "left"];
	const oldValuations = grid.map((row) => row.map((cell) => cell.valuation));

	// Collect customer-vendor relationships
	for (let i = 0; i < cols; i++) {
		for (let j = 0; j < rows; j++) {
			let numVendors = 0;
			let totalUtility = 0;
			let totalValuation = {
				currencyOne: 0,
				currencyTwo: 0,
			};

			directions.forEach((dir) => {
				if (grid[i][j][dir]) {
					let target = getTargetSquare(i, j, dir);
					if (target) {
						let pmt = calculatePayment(grid[i][j], grid[target.i][target.j]);
						let cst = calculateCost(pmt, grid[i][j]);

						relationships.push({
							customer: { i, j },
							vendor: target,
							payment: pmt,
							cost: cst,
						});

						// Increment valuation totals
						let oldValuation = oldValuations[target.i][target.j];
						let utilityWeight = grid[i][j].demand - cst;

						if (utilityWeight > 0) {
							numVendors++;
							totalUtility += utilityWeight;

							totalValuation.currencyOne +=
								oldValuation.currencyOne * utilityWeight;
							totalValuation.currencyTwo +=
								oldValuation.currencyTwo * utilityWeight;
						}
					}
				}
			});

			// Update valuations
			if (totalUtility > 0) {
				grid[i][j].valuation.currencyOne =
					totalValuation.currencyOne / totalUtility;
				grid[i][j].valuation.currencyTwo =
					totalValuation.currencyTwo / totalUtility;
			}
		}
	}

	// Track any purchases that are made
	// Shuffle relationships to ensure a random order
	shuffleArray(relationships);

	relationships.forEach((rel) => {
		let customerSquare = grid[rel.customer.i][rel.customer.j];
		let vendorSquare = grid[rel.vendor.i][rel.vendor.j];

		// Check if the transaction should occur based on demand, cost, and available funds
		if (
			rel.cost < customerSquare.demand &&
			rel.payment.every((amount) => amount >= 0) &&
			customerSquare.currencyOne >= rel.payment[0] &&
			customerSquare.currencyTwo >= rel.payment[1]
		) {
			// Transaction occurs
			customerSquare.currencyOne -= rel.payment[0];
			customerSquare.currencyTwo -= rel.payment[1];
			vendorSquare.currencyOne += rel.payment[0];
			vendorSquare.currencyTwo += rel.payment[1];
		}
	});
}

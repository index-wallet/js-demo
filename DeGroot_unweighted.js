function pesDeGrootUnweighted(grid, cols, rows) {
	let relationships = [];
	const directions = ["top", "right", "bottom", "left"];

	// Save old valuations
	const oldValuations = grid.map((row) => row.map((cell) => cell.valuation));

	// Collect customer-vendor relationships
	for (let i = 0; i < cols; i++) {
		for (let j = 0; j < rows; j++) {
			let numVendors = 0;
			let totalValuation = {
				currencyOne: 0,
				currencyTwo: 0,
			};

			directions.forEach((dir) => {
				if (grid[i][j][dir]) {
					let target = getTargetSquare(i, j, dir);
					if (target) {
						relationships.push({ customer: { i, j }, vendor: target });

						// increment valuation totals
						numVendors++;
						let oldValuation = oldValuations[target.i][target.j];
						totalValuation.currencyOne += oldValuation.currencyOne;
						totalValuation.currencyTwo += oldValuation.currencyTwo;
					}
				}
			});

			// update valuations
			grid[i][j].valuation.currencyOne =
				totalValuation.currencyOne / numVendors;
			grid[i][j].valuation.currencyTwo =
				totalValuation.currencyTwo / numVendors;
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
}

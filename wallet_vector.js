function pesWalletVector(grid, cols, rows) {
	let relationships = [];

	// Collect customer-vendor relationships
	for (let i = 0; i < cols; i++) {
		for (let j = 0; j < rows; j++) {
			let directions = ["top", "right", "bottom", "left"];
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
			const square = grid[i][j];

			// TODO: what should I set the normalized scale to?
			let walletTotal = square.currencyOne + square.currencyTwo;
			square.valuation.currencyOne = square.currencyOne / walletTotal;
			square.valuation.currencyTwo = square.currencyTwo / walletTotal;
		}
	}
}

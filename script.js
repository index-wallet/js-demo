let grid;
let cols, rows;
let w = 40; // width of each square
let currencyTwoButton;
let speedSlider;
let connectivity = 0.85;
let lastFrameTime = 0;
let isSquareSelected = false;
let selectedSquare = { i: -1, j: -1 };
let dynamicControls = [];
let selectedCurrency = null;
let chartX, chartY, chartWidth, chartHeight;
let isMousePressed = false;
let isMouseClicked = false;
let inputCurrencyOne,
	inputCurrencyTwo,
	inputCurrencyOneAmount,
	inputCurrencyTwoAmount,
	inputPrice,
	inputDemand;

function setup() {
	createCanvas(400, 600);
	cols = Math.floor(width / w);
	rows = Math.max(Math.floor(width / w) - 1, 0);

	grid = new Array(cols);
	for (let i = 0; i < cols; i++) {
		grid[i] = new Array(rows);
		for (let j = 0; j < rows; j++) {
			grid[i][j] = {
				top: random(1) < connectivity,
				right: random(1) < connectivity,
				bottom: random(1) < connectivity,
				left: random(1) < connectivity,
				currencyOne: random(),
				currencyTwo: 0,
				price: random(0.1, 1),
				valuation: {
					currencyOne: random(),
					currencyTwo: random(),
				},
				demand: random(0.5, 1.5),
			};
		}
	}

	speedSlider = createSlider(0, 3, 0);
	speedSlider.position(20, height - 210);
	speedSlider.style("width", "80px");

	let pauseLabel = createP("Pause");
	pauseLabel.position(speedSlider.x, speedSlider.y + 10);
	pauseLabel.style("user-select", "none");
	pauseLabel.style("font-size", "12px");

	wraparoundCheckbox = createCheckbox("Wraparound", true);
	wraparoundCheckbox.position(18, height - 170);
	wraparoundCheckbox.style("font-size", "12px");

	let fasterLabel = createP("Faster");
	fasterLabel.position(
		speedSlider.x + speedSlider.width - 25,
		speedSlider.y + 10,
	);
	fasterLabel.style("user-select", "none");
	fasterLabel.style("font-size", "12px");

	chartX = speedSlider.x + speedSlider.width + 40;
	chartY = height - 200;
	chartWidth = 40;
	chartHeight = 50;

	// Create permanent input boxes
	inputCurrencyOne = createInput("", "number");
	inputCurrencyOne.position(100, height - 65);
	inputCurrencyOne.style("width", "80px");
	inputCurrencyOne.attribute("step", "0.15");
	inputCurrencyOne.hide();

	inputCurrencyTwo = createInput("", "number");
	inputCurrencyTwo.position(100, height - 45);
	inputCurrencyTwo.style("width", "80px");
	inputCurrencyTwo.attribute("step", "0.15");
	inputCurrencyTwo.hide();

	// New input boxes for currency amounts, price, and demand
	inputCurrencyOneAmount = createInput("", "number");
	inputCurrencyOneAmount.position(100, height - 125);
	inputCurrencyOneAmount.style("width", "80px");
	inputCurrencyOneAmount.attribute("step", "0.15");
	inputCurrencyOneAmount.hide();

	inputCurrencyTwoAmount = createInput("", "number");
	inputCurrencyTwoAmount.position(100, height - 105);
	inputCurrencyTwoAmount.style("width", "80px");
	inputCurrencyTwoAmount.attribute("step", "0.15");
	inputCurrencyTwoAmount.hide();

	inputPrice = createInput("", "number");
	inputPrice.position(300, height - 45);
	inputPrice.style("width", "80px");
	inputPrice.attribute("step", "0.15");
	inputPrice.hide();

	inputDemand = createInput("", "number");
	inputDemand.position(300, height - 25);
	inputDemand.style("width", "80px");
	inputDemand.attribute("step", "0.15");
	inputDemand.hide();
}

function draw() {
	background(240);
	drawSupply();
	displayTooltips();

	for (let i = 0; i < cols; i++) {
		for (let j = 0; j < rows; j++) {
			let x = i * w;
			let y = j * w;

			let square = grid[i][j];
			let ownership, valuation;

			if (selectedCurrency === "yellow") {
				ownership = square.currencyOne;
				valuation = square.valuation.currencyOne;
				fill(lerpColor(color(240), color(255, 255, 0), ownership));
			} else if (selectedCurrency === "blue") {
				ownership = square.currencyTwo;
				valuation = square.valuation.currencyTwo;
				fill(lerpColor(color(240), color(0, 0, 255), ownership));
			} else {
				let redAmount = square.currencyOne;
				let greenAmount = square.currencyTwo;
				let totalAmount = redAmount + greenAmount;

				let mixedColor;

				if (totalAmount === 0) {
					mixedColor = color(240);
				} else {
					let redRatio = redAmount / totalAmount;
					let greenRatio = greenAmount / totalAmount;

					mixedColor = lerpColor(
						color(255, 255, 0),
						color(0, 0, 255),
						greenRatio,
					);
					mixedColor.setAlpha(255 * (totalAmount / (totalAmount + 1)));
				}

				fill(mixedColor);
				valuation = null;
			}

			stroke(0);
			rect(x, y, w, w);

			if (valuation !== null) {
				let dotSize = map(abs(valuation), 0, 1, 0, w / 2);
				let dotColor =
					valuation < 0
						? color(0)
						: selectedCurrency === "yellow"
							? color(0)
							: color(255);

				if (valuation < 0) {
					fill(dotColor); // Filled circle for negative valuations
				} else {
					noFill(); // Hollow circle for positive valuations
				}

				ellipse(x + w / 2, y + w / 2, dotSize, dotSize);
			}

			if (
				isSquareSelected &&
				selectedSquare.i === i &&
				selectedSquare.j === j
			) {
				stroke(0, 0, 255);
				strokeWeight(4);
				noFill();
				rect(x, y, w, w);
				strokeWeight(1);
			}

			if (isSquareSelected && isCustomerOf(selectedSquare, { i, j })) {
				let customerSquare = grid[selectedSquare.i][selectedSquare.j];
				let vendorSquare = grid[i][j];
				let demand = customerSquare.demand;
				let payment = calculatePayment(customerSquare, vendorSquare);
				let cost = calculateCost(payment, customerSquare);

				let larger = demand > cost ? "demand" : "cost";

				textSize(10);
				noStroke();
				fill(0);
				textAlign(CENTER, CENTER);

				if (larger === "demand") {
					textStyle(BOLD);
					text(`${demand.toFixed(2)}`, x + w / 2, y + w / 4);
					textStyle(NORMAL);
					text(`${cost.toFixed(2)}`, x + w / 2, y + (3 * w) / 4);
				} else {
					text(`${demand.toFixed(2)}`, x + w / 2, y + w / 4);
					textStyle(BOLD);
					text(`${cost.toFixed(2)}`, x + w / 2, y + (3 * w) / 4);
					textStyle(NORMAL);
				}

				textSize(10);
				textStyle(BOLD);
				text(demand > cost ? "✓" : "×", x + w / 2, y + w / 2);
				textStyle(NORMAL);
			} else {
				if (grid[i][j].top) drawArrow(x, y, "top", i, j);
				if (grid[i][j].right) drawArrow(x, y, "right", i, j);
				if (grid[i][j].bottom) drawArrow(x, y, "bottom", i, j);
				if (grid[i][j].left) drawArrow(x, y, "left", i, j);
			}

			textStyle(NORMAL);
			strokeWeight(1);
		}
	}

	let elapsedTime = millis() - lastFrameTime;
	lastFrameTime = millis();

	let transactionsPerSecond = pow(10, speedSlider.value());

	if (speedSlider.value() === 0) {
		transactionsPerSecond = 0;
	}

	let transactionsToProcess = transactionsPerSecond * (elapsedTime / 1000);
	for (let i = 0; i < transactionsToProcess; i++) {
		processEconomyStep();
	}

	if (mouseX >= 0 && mouseX < width && mouseY >= 0 && mouseY < height - w) {
		let i = Math.floor(mouseX / w);
		let j = Math.floor(mouseY / w);

		if (i >= 0 && i < cols && j >= 0 && j < rows) {
			let square = grid[i][j];
			fill(0);
			noStroke();
			textSize(12);
			textAlign(LEFT, TOP);
			textStyle(BOLD);
			text(
				`Y: ${square.valuation.currencyOne.toFixed(
					2,
				)}\nB: ${square.valuation.currencyTwo.toFixed(2)}`,
				mouseX + 10,
				mouseY + 10,
			);
			textStyle(NORMAL);
		}
	}

	if (isSquareSelected) {
		inputCurrencyOne.show();
		inputCurrencyTwo.show();
		inputCurrencyOneAmount.show();
		inputCurrencyTwoAmount.show();
		inputPrice.show();
		inputDemand.show();
		displayControlPanel();
	} else {
		inputCurrencyOne.hide();
		inputCurrencyTwo.hide();
		inputCurrencyOneAmount.hide();
		inputCurrencyTwoAmount.hide();
		inputPrice.hide();
		inputDemand.hide();
	}
}

function displayControlPanel() {
	let square = grid[selectedSquare.i][selectedSquare.j];

	fill(0);
	textSize(12);
	strokeWeight(0);
	textAlign(LEFT, TOP);

	text(`Wallet:`, 20, height - 140);
	text(`Y: ${square.currencyOne.toFixed(2)}`, 40, height - 120);
	text(`B: ${square.currencyTwo.toFixed(2)}`, 40, height - 100);

	text(`Price: `, 200, height - 40);

	text(`Demand: `, 200, height - 20);

	textSize(12);
	textAlign(LEFT, TOP);
	text(`Valuation:`, 20, height - 80);
	text(`Y: ${square.valuation.currencyOne.toFixed(2)}`, 40, height - 60);

	text(`B: ${square.valuation.currencyTwo.toFixed(2)}`, 40, height - 40);

	text(`Vendors:`, 200, height - 140);
	text(`Top: ${square.top ? "On" : "Off"}`, 220, height - 120);
	text(`Right: ${square.right ? "On" : "Off"}`, 220, height - 100);
	text(`Bottom: ${square.bottom ? "On" : "Off"}`, 220, height - 80);
	text(`Left: ${square.left ? "On" : "Off"}`, 220, height - 60);

	// Moved to input handlers
	createVendorButtons(square); // Create vendor buttons here
}

function createInputHandlers(square) {
	// Update valuation inputs
	inputCurrencyOne.value(square.valuation.currencyOne.toFixed(2));
	inputCurrencyOne.input(() => {
		let val = parseFloat(inputCurrencyOne.value());
		if (!isNaN(val)) {
			square.valuation.currencyOne = val;
		}
	});

	inputCurrencyTwo.value(square.valuation.currencyTwo.toFixed(2));
	inputCurrencyTwo.input(() => {
		let val = parseFloat(inputCurrencyTwo.value());
		if (!isNaN(val)) {
			square.valuation.currencyTwo = val;
		}
	});

	// Update wallet inputs
	inputCurrencyOneAmount.value(square.currencyOne.toFixed(2));
	inputCurrencyOneAmount.input(() => {
		let val = parseFloat(inputCurrencyOneAmount.value());
		if (!isNaN(val)) {
			square.currencyOne = val;
		}
	});

	inputCurrencyTwoAmount.value(square.currencyTwo.toFixed(2));
	inputCurrencyTwoAmount.input(() => {
		let val = parseFloat(inputCurrencyTwoAmount.value());
		if (!isNaN(val)) {
			square.currencyTwo = val;
		}
	});

	// Update price input
	inputPrice.value(square.price.toFixed(2));
	inputPrice.input(() => {
		let val = parseFloat(inputPrice.value());
		if (!isNaN(val)) {
			square.price = val;
		}
	});

	// Update demand input
	inputDemand.value(square.demand.toFixed(2));
	inputDemand.input(() => {
		let val = parseFloat(inputDemand.value());
		if (!isNaN(val)) {
			square.demand = val;
		}
	});
}

function createValuationInputs(square) {
	inputCurrencyOne.value(square.valuation.currencyOne.toFixed(2));
	inputCurrencyOne.input(() => {
		let val = parseFloat(inputCurrencyOne.value());
		if (!isNaN(val)) {
			square.valuation.currencyOne = val;
		}
	});

	inputCurrencyTwo.value(square.valuation.currencyTwo.toFixed(2));
	inputCurrencyTwo.input(() => {
		let val = parseFloat(inputCurrencyTwo.value());
		if (!isNaN(val)) {
			square.valuation.currencyTwo = val;
		}
	});
}

function mouseClicked() {
	let i = Math.floor(mouseX / w);
	let j = Math.floor(mouseY / w);

	if (mouseX >= 0 && mouseX < width && mouseY >= 0 && mouseY < height - 200) {
		if (i >= 0 && i < cols && j >= 0 && j < rows) {
			if (
				isSquareSelected &&
				selectedSquare.i === i &&
				selectedSquare.j === j
			) {
				// If the clicked square is already selected, deselect it
				isSquareSelected = false;
				clearDynamicControls();
			} else {
				// Select the clicked square
				selectedSquare = { i, j };
				isSquareSelected = true;
				clearDynamicControls();
				createInputHandlers(grid[selectedSquare.i][selectedSquare.j]);
			}
		} else {
			// Deselect if clicked outside valid grid area
			isSquareSelected = false;
			clearDynamicControls();
		}
	}
}

function createVendorButtons(square) {
	let buttonTop = createButton("↑");
	buttonTop.position(304, height - 128);
	buttonTop.mousePressed(() => {
		square.top = !square.top;
	});
	dynamicControls.push(buttonTop);

	let buttonRight = createButton("→");
	buttonRight.position(327, height - 105);
	buttonRight.mousePressed(() => {
		square.right = !square.right;
	});
	dynamicControls.push(buttonRight);

	let buttonBottom = createButton("↓");
	buttonBottom.position(304, height - 82);
	buttonBottom.mousePressed(() => {
		square.bottom = !square.bottom;
	});
	dynamicControls.push(buttonBottom);

	let buttonLeft = createButton("←");
	buttonLeft.position(275, height - 105);
	buttonLeft.mousePressed(() => {
		square.left = !square.left;
	});
	dynamicControls.push(buttonLeft);
}

// function mouseClicked() {
//   let i = Math.floor(mouseX / w);
//   let j = Math.floor(mouseY / w);

//   if (mouseX >= 0 && mouseX < width && mouseY >= 0 && mouseY < height - 200) {
//     if (i >= 0 && i < cols && j >= 0 && j < rows) {
//       if (isSquareSelected && selectedSquare.i === i && selectedSquare.j === j) {
//         // If the clicked square is already selected, deselect it
//         isSquareSelected = false;
//         clearDynamicControls();
//       } else {
//         // Select the clicked square
//         selectedSquare = { i, j };
//         isSquareSelected = true;
//         clearDynamicControls();
//         displayControlPanel();
//       }
//     } else {
//       // Deselect if clicked outside valid grid area
//       isSquareSelected = false;
//       clearDynamicControls();
//     }
//   }
// }

function processEconomyStep() {
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
}

function calculatePayment(customerSquare, vendorSquare) {
	let wallet = [customerSquare.currencyOne, customerSquare.currencyTwo];
	let vendorValuation = [
		vendorSquare.valuation.currencyOne,
		vendorSquare.valuation.currencyTwo,
	];

	let dotProduct =
		wallet[0] * vendorValuation[0] + wallet[1] * vendorValuation[1];
	dotProduct = Math.max(dotProduct, 1e-6); // Avoid division by zero
	let payment = wallet.map(
		(amount) => amount * (vendorSquare.price / dotProduct),
	);

	return payment;
}

function calculateCost(payment, customerSquare) {
	let customerValuation = [
		customerSquare.valuation.currencyOne,
		customerSquare.valuation.currencyTwo,
	];
	let cost =
		payment[0] * customerValuation[0] + payment[1] * customerValuation[1];
	return cost;
}

function drawArrow(x, y, direction, i, j) {
	if (selectedCurrency !== "yellow" && selectedCurrency !== "blue") {
		if (!wraparoundCheckbox.checked()) {
			// Don't draw arrows pointing towards the edge when wraparound is disabled
			if (
				(direction === "top" && j === 0) ||
				(direction === "right" && i === cols - 1) ||
				(direction === "bottom" && j === rows - 1) ||
				(direction === "left" && i === 0)
			) {
				return;
			}
		}

		push(); // Save the drawing state
		translate(x + w / 2, y + w / 2); // Start from the center of the square
		stroke(0); // Set stroke color to black
		fill(0); // Set fill color to black for a solid wedge

		// Reduce the size of the wedge arms for a smaller indicator
		let armLength = w / 6; // Smaller arm length for a more subtle indicator
		let edgeOffset = w / 4; // Distance from the center to start drawing the wedge
		let angleOffset = PI / 4; // Adjust for a sharper wedge

		// Adjust the starting position and rotation based on the direction
		switch (direction) {
			case "top":
				translate(0, -edgeOffset); // Move towards the top edge
				rotate(0); // Rotate to point upwards
				break;
			case "right":
				translate(edgeOffset, 0); // Move towards the right edge
				rotate(HALF_PI); // Default orientation points to the right
				break;
			case "bottom":
				translate(0, edgeOffset); // Move towards the bottom edge
				rotate(PI); // Rotate to point downwards
				break;
			case "left":
				translate(-edgeOffset, 0); // Move towards the left edge
				rotate(-HALF_PI); // Rotate to point to the left
				break;
		}

		// Draw the wedge shape
		beginShape();
		vertex(0, -armLength / 2); // Top point of the wedge
		vertex(-armLength * cos(angleOffset), 0); // Bottom left of the wedge
		vertex(armLength * cos(angleOffset), 0); // Bottom right of the wedge
		endShape(CLOSE); // Close the shape to fill it

		pop(); // Restore the drawing state
	}
}

function getTargetSquare(i, j, direction) {
	// Calculate the target square based on the direction
	let targetI = i;
	let targetJ = j;

	switch (direction) {
		case "top":
			targetJ = wraparoundCheckbox.checked() ? (j - 1 + rows) % rows : j - 1;
			break;
		case "right":
			targetI = wraparoundCheckbox.checked() ? (i + 1) % cols : i + 1;
			break;
		case "bottom":
			targetJ = wraparoundCheckbox.checked() ? (j + 1) % rows : j + 1;
			break;
		case "left":
			targetI = wraparoundCheckbox.checked() ? (i - 1 + cols) % cols : i - 1;
			break;
	}

	// Check if the target square is within bounds
	if (targetI >= 0 && targetI < cols && targetJ >= 0 && targetJ < rows) {
		return { i: targetI, j: targetJ };
	} else {
		return null; // Return null if the target square is out of bounds
	}
}

function shuffleArray(array) {
	for (let i = array.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[array[i], array[j]] = [array[j], array[i]]; // Swap elements
	}
}

function createPriceAndDemandButtons(square) {
	let buttonPriceInc = createButton("+");
	buttonPriceInc.position(300, height - 45);
	buttonPriceInc.mousePressed(() => {
		square.price += 0.1;
	});
	dynamicControls.push(buttonPriceInc);

	let buttonPriceDec = createButton("-");
	buttonPriceDec.position(320, height - 45);
	buttonPriceDec.mousePressed(() => {
		square.price = Math.max(square.price - 0.1, 0);
	});
	dynamicControls.push(buttonPriceDec);

	let buttonDemandInc = createButton("+");
	buttonDemandInc.position(300, height - 25);
	buttonDemandInc.mousePressed(() => {
		square.demand += 0.1;
	});
	dynamicControls.push(buttonDemandInc);

	let buttonDemandDec = createButton("-");
	buttonDemandDec.position(320, height - 25);
	buttonDemandDec.mousePressed(() => {
		square.demand = Math.max(square.demand - 0.1, 0);
	});
	dynamicControls.push(buttonDemandDec);
}

function clearDynamicControls() {
	dynamicControls.forEach((control) => control.remove());
	dynamicControls = [];
}

function drawSupply() {
	let totalY = 0,
		totalB = 0;

	for (let i = 0; i < cols; i++) {
		for (let j = 0; j < rows; j++) {
			totalY += grid[i][j].currencyOne;
			totalB += grid[i][j].currencyTwo;
		}
	}

	let maxYB = Math.max(totalY, totalB); // Find the maximum value to normalize the bars
	let barWidth = chartWidth / 3; // Width of each bar

	// Draw background for the chart area (optional)
	fill(220);
	noStroke();
	rect(chartX - 10, chartY - 10, chartWidth + 20, chartHeight + 20);

	// Normalize the heights of the bars
	let normalizedY = (totalY / maxYB) * chartHeight;
	let normalizedB = (totalB / maxYB) * chartHeight;

	// Draw Y bar
	fill("yellow");
	rect(chartX, chartY + chartHeight - normalizedY, barWidth, normalizedY);

	// Draw B bar
	fill("blue");
	rect(
		chartX + barWidth * 2,
		chartY + chartHeight - normalizedB,
		barWidth,
		normalizedB,
	);

	// Draw black box around the selected currency
	if (selectedCurrency === "yellow") {
		stroke(0);
		strokeWeight(2);
		noFill();
		rect(chartX - 5, chartY - 5, barWidth + 10, chartHeight + 10);
	} else if (selectedCurrency === "blue") {
		stroke(0);
		strokeWeight(2);
		noFill();
		rect(
			chartX + barWidth * 2 - 5,
			chartY - 5,
			barWidth + 10,
			chartHeight + 10,
		);
	}
	strokeWeight(0);

	// Add currency selection functionality
	if (
		mouseX >= chartX &&
		mouseX <= chartX + chartWidth &&
		mouseY >= chartY &&
		mouseY <= chartY + chartHeight
	) {
		if (mouseIsPressed && !isMouseClicked) {
			isMouseClicked = true;
			if (mouseX <= chartX + barWidth) {
				selectedCurrency = selectedCurrency === "yellow" ? null : "yellow";
			} else if (mouseX >= chartX + barWidth * 2) {
				selectedCurrency = selectedCurrency === "blue" ? null : "blue";
			}
		} else if (!mouseIsPressed) {
			isMouseClicked = false;
		}
	}

	// Add labels (optional)
	fill(0);
	textSize(10);
	textAlign(CENTER, BOTTOM);
	text("Y", chartX + barWidth / 2, chartY + chartHeight + 20);
	text("B", chartX + barWidth * 2.5, chartY + chartHeight + 20);

	let textX = chartX + chartWidth + 15; // Position the text to the right of the chart
	let textY = chartY + chartHeight / 4; // Start halfway down the chart

	// Set text properties
	textSize(12);
	textAlign(LEFT, TOP);
	fill(0);

	// Display the totals
	text(`Y: ${totalY.toFixed(0)}`, textX, textY);
	text(`B: ${totalB.toFixed(0)}`, textX, textY + 20);
}

function displayTooltips() {
	if (
		mouseX >= chartX &&
		mouseX <= chartX + chartWidth &&
		mouseY >= chartY &&
		mouseY <= chartY + chartHeight
	) {
		// fill(0);
		textAlign(LEFT, BOTTOM);
		if (selectedCurrency === "yellow" || selectedCurrency === "blue") {
			text("Click again to return to standard view", mouseX, mouseY - 5);
		} else {
			text("Click on a bar to view currency details", mouseX, mouseY - 5);
		}
	}
}

function isCustomerOf(selectedSquare, potentialVendor) {
	// Directions are the same as where they point to be a vendor
	const directions = [
		{ dir: "top", offset: { i: 0, j: -1 } },
		{ dir: "right", offset: { i: 1, j: 0 } },
		{ dir: "bottom", offset: { i: 0, j: 1 } },
		{ dir: "left", offset: { i: -1, j: 0 } },
	];

	for (let { dir, offset } of directions) {
		let targetI = selectedSquare.i + offset.i;
		let targetJ = selectedSquare.j + offset.j;

		// Handle wraparound if enabled
		if (wraparoundCheckbox.checked()) {
			targetI = (targetI + cols) % cols;
			targetJ = (targetJ + rows) % rows;
		}

		if (
			targetI === potentialVendor.i &&
			targetJ === potentialVendor.j &&
			grid[selectedSquare.i][selectedSquare.j][dir]
		) {
			return true;
		}
	}
	return false;
}

function clearDynamicControls() {
	dynamicControls.forEach((control) => control.remove());
	dynamicControls = [];
}

function showYellowCurrency() {
	selectedCurrency = "yellow";
}

function showBlueCurrency() {
	selectedCurrency = "blue";
}

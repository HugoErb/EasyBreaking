const ITEMS_PER_POINT_FACTOR = 201385.01619;
const RATE_EXPONENT = -1.853943;
const LEVEL_EXPONENT = -0.791569;
const MAX_LEVEL = 200;
// Faux've level 200 in ML Pourcent.csv: 19 items observed from 288% to 189%.
const MAX_LEVEL_CALIBRATION_FACTOR = 1.56007119319;

export function estimateItemsToReachRate(startRate: number, targetRate: number, level: number): number {
	if (startRate <= targetRate) return 0;

	const safeLevel = Math.max(level, 1);
	let total = 0;

	for (let rate = startRate; rate > targetRate; rate--) {
		total += ITEMS_PER_POINT_FACTOR * Math.pow(rate, RATE_EXPONENT) * Math.pow(safeLevel, LEVEL_EXPONENT);
	}

	if (safeLevel === MAX_LEVEL) {
		total *= MAX_LEVEL_CALIBRATION_FACTOR;
	}

	return Math.round(total);
}

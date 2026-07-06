const ITEMS_PER_POINT_FACTOR = 201385.01619;
const RATE_EXPONENT = -1.853943;
const LEVEL_EXPONENT = -0.791569;

export function estimateItemsToReachRate(startRate: number, targetRate: number, level: number): number {
	if (startRate <= targetRate) return 0;

	const safeLevel = Math.max(level, 1);
	let total = 0;

	for (let rate = startRate; rate > targetRate; rate--) {
		total += ITEMS_PER_POINT_FACTOR * Math.pow(rate, RATE_EXPONENT) * Math.pow(safeLevel, LEVEL_EXPONENT);
	}

	return Math.round(total);
}

import { estimateItemsToReachRate } from './break-rate-estimator';

describe('estimateItemsToReachRate', () => {
	it('returns 0 when the start rate is already below or equal to the target rate', () => {
		expect(estimateItemsToReachRate(100, 100, 50)).toBe(0);
		expect(estimateItemsToReachRate(90, 100, 50)).toBe(0);
	});

	it('uses level 1 as the minimum level', () => {
		expect(estimateItemsToReachRate(319, 316, 0)).toBe(14);
		expect(estimateItemsToReachRate(319, 316, 1)).toBe(14);
	});

	it('estimates representative cleaned CSV rows', () => {
		expect(estimateItemsToReachRate(201, 197, 27)).toBe(3);
		expect(estimateItemsToReachRate(2220, 1410, 8)).toBe(30);
		expect(estimateItemsToReachRate(43, 37, 34)).toBe(78);
	});

	it('rounds the final estimated item count', () => {
		expect(estimateItemsToReachRate(105, 100, 104)).toBe(5);
	});
});

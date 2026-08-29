import {
	ITEM_CRAFT_PRICES_STORAGE_KEY,
	readStoredItemCraftPrice,
	storeItemCraftPrice,
} from './item-craft-prices';

describe('item craft prices', () => {
	afterEach(() => localStorage.removeItem(ITEM_CRAFT_PRICES_STORAGE_KEY));

	it('stores and restores a craft price for the same item', () => {
		const item = { name: 'Anneau test', type: 'Anneau', level: 100 };

		storeItemCraftPrice(item, 125_000);

		expect(readStoredItemCraftPrice(item)).toBe(125_000);
		expect(readStoredItemCraftPrice({ ...item, level: 101 })).toBeNull();
	});

	it('removes the stored price when the field is cleared', () => {
		const item = { name: 'Anneau test', type: 'Anneau', level: 100 };
		storeItemCraftPrice(item, 125_000);

		storeItemCraftPrice(item, null);

		expect(readStoredItemCraftPrice(item)).toBeNull();
	});

	it('ignores corrupted stored data', () => {
		localStorage.setItem(ITEM_CRAFT_PRICES_STORAGE_KEY, '{invalid-json');

		expect(readStoredItemCraftPrice({ name: 'Anneau test' })).toBeNull();
	});
});

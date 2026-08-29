export const ITEM_CRAFT_PRICES_STORAGE_KEY = 'itemCraftPrices';

export interface CraftPriceItem {
	name?: unknown;
	type?: unknown;
	level?: unknown;
}

export function readStoredItemCraftPrice(item: CraftPriceItem): number | null {
	const key = getItemCraftPriceKey(item);
	if (!key) return null;
	return readStoredItemCraftPrices()[key] ?? null;
}

export function storeItemCraftPrice(item: CraftPriceItem, price: number | null): void {
	const key = getItemCraftPriceKey(item);
	if (!key) return;

	const prices = readStoredItemCraftPrices();
	if (typeof price === 'number' && Number.isFinite(price) && price > 0) prices[key] = price;
	else delete prices[key];

	localStorage.setItem(ITEM_CRAFT_PRICES_STORAGE_KEY, JSON.stringify(prices));
}

function getItemCraftPriceKey(item: CraftPriceItem): string | null {
	if (typeof item.name !== 'string' || item.name.trim().length === 0) return null;
	return JSON.stringify([
		item.name.trim(),
		typeof item.type === 'string' ? item.type.trim() : '',
		item.level == null ? '' : String(item.level),
	]);
}

function readStoredItemCraftPrices(): Record<string, number> {
	try {
		const rawPrices: unknown = JSON.parse(localStorage.getItem(ITEM_CRAFT_PRICES_STORAGE_KEY) ?? '{}');
		if (typeof rawPrices !== 'object' || rawPrices === null || Array.isArray(rawPrices)) return {};

		return Object.fromEntries(
			Object.entries(rawPrices).filter(
				([, price]) => typeof price === 'number' && Number.isFinite(price) && price > 0,
			),
		);
	} catch {
		return {};
	}
}

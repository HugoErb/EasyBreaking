import { TranscendenceRuneData } from './exotic-effects';

export const TRANSCENDENCE_RUNE_PRICES_STORAGE_KEY = 'transcendenceRunePrices';

export interface PricedTranscendenceRuneData extends TranscendenceRuneData {
	price: number;
}

export function applyStoredTranscendencePrices(runes: TranscendenceRuneData[]): PricedTranscendenceRuneData[] {
	const prices = readStoredTranscendencePrices();
	return runes.map((rune) => ({ ...rune, price: prices[rune.id] ?? 1 }));
}

export function storeTranscendencePrices(runes: PricedTranscendenceRuneData[]): void {
	const prices = Object.fromEntries(runes.map((rune) => [rune.id, rune.price]));
	localStorage.setItem(TRANSCENDENCE_RUNE_PRICES_STORAGE_KEY, JSON.stringify(prices));
}

function readStoredTranscendencePrices(): Record<number, number> {
	try {
		const rawPrices: unknown = JSON.parse(localStorage.getItem(TRANSCENDENCE_RUNE_PRICES_STORAGE_KEY) ?? '{}');
		if (typeof rawPrices !== 'object' || rawPrices === null || Array.isArray(rawPrices)) return {};

		return Object.fromEntries(
			Object.entries(rawPrices).filter(
				([id, price]) => Number.isInteger(Number(id)) && typeof price === 'number' && Number.isFinite(price) && price >= 0,
			),
		);
	} catch {
		return {};
	}
}

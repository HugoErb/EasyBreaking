export interface RuneData {
	name: string;
	stat: string;
	img: string;
	price: number;
	weight: number;
	paPrice?: number | null;
	raPrice?: number | null;
}

const UNSUPPORTED_RUNE_STATS = new Set(['arme de chasse']);

export function isUnsupportedRuneStat(stat: string): boolean {
	return UNSUPPORTED_RUNE_STATS.has(stat.trim().toLocaleLowerCase('fr-FR'));
}

function parseRequiredNumber(value: unknown, minimum: number): number | null {
	const parsedValue = typeof value === 'number' || typeof value === 'string' ? Number(value) : Number.NaN;
	return Number.isFinite(parsedValue) && parsedValue >= minimum ? parsedValue : null;
}

function parseOptionalPrice(value: unknown): number | null | undefined {
	if (value === null) return null;
	if (value === undefined) return undefined;
	return parseRequiredNumber(value, 0) ?? undefined;
}

export function parseRunesData(value: unknown): RuneData[] | null {
	if (!Array.isArray(value) || value.length === 0) return null;

	const runes: RuneData[] = [];
	for (const candidate of value) {
		if (typeof candidate !== 'object' || candidate === null) return null;

		const rune = candidate as Record<string, unknown>;
		const name = typeof rune['name'] === 'string' ? rune['name'].trim() : '';
		const stat = typeof rune['stat'] === 'string' ? rune['stat'].trim() : '';
		const img = typeof rune['img'] === 'string' ? rune['img'].trim() : '';
		const price = parseRequiredNumber(rune['price'], 0);
		const weight = parseRequiredNumber(rune['weight'], Number.EPSILON);
		const paPrice = parseOptionalPrice(rune['paPrice']);
		const raPrice = parseOptionalPrice(rune['raPrice']);

		if (!name || !stat || !img || price === null || weight === null) return null;
		if (rune['paPrice'] !== null && rune['paPrice'] !== undefined && paPrice === undefined) return null;
		if (rune['raPrice'] !== null && rune['raPrice'] !== undefined && raPrice === undefined) return null;

		if (!isUnsupportedRuneStat(stat)) {
			runes.push({ name, stat, img, price, weight, paPrice, raPrice });
		}
	}

	return runes.length > 0 ? runes : null;
}

export function readStoredRunes(): RuneData[] | null {
	try {
		const storedRunes = localStorage.getItem('runesData');
		if (!storedRunes) return null;

		const rawRunes = JSON.parse(storedRunes);
		const runes = parseRunesData(rawRunes);
		if (
			runes &&
			Array.isArray(rawRunes) &&
			rawRunes.some(
				(candidate) =>
					typeof candidate === 'object' &&
					candidate !== null &&
					typeof candidate.stat === 'string' &&
					isUnsupportedRuneStat(candidate.stat),
			)
		) {
			storeRunes(runes);
		}

		return runes;
	} catch {
		return null;
	}
}

export function storeRunes(runes: RuneData[]): void {
	try {
		localStorage.setItem('runesData', JSON.stringify(runes));
	} catch (error) {
		console.error("Les données des runes n'ont pas pu être enregistrées.", error);
	}
}

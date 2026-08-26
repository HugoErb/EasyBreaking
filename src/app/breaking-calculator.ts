import { isUnfocusableRuneStat, RuneData } from './rune-data';

const PA_RUNE_RATIO = 3;
const RA_RUNE_RATIO = 9;
const SALE_TAX_MULTIPLIER = 0.98;

export interface BreakingItem {
	name: string;
	image: string;
	type: string;
	level: number | string;
	effects: string[];
	recipe?: unknown[];
	set?: string;
	link?: string;
}

export interface BreakingEffectResult {
	stat: string;
	runeName: string;
	canFocus: boolean;
	runePrice: number;
	paPrice?: number | null;
	raPrice?: number | null;
	runeImg: string;
	runeQuantity: string;
	kamasEarned: number;
	basePaKamasEarned: number;
	baseRaKamasEarned: number;
	runeQuantityFocused: string;
	focusedKamasEarned: number;
	paRuneQuantity: string;
	paKamasEarned: number;
	raRuneQuantity: string;
	raKamasEarned: number;
}

export type BreakingStrategyKind = 'standard' | 'focus' | 'fusion';

export interface BreakingCalculationResult {
	rows: BreakingEffectResult[];
	standardKamas: number;
	bestNonFocusedKamas: number;
	bestWithoutFusionKamas: number;
	bestFocusedKamas: number;
	bestKamas: number;
	mergeName: string;
	fusionKamas: number;
	nonFocusedMerges: string[];
	strategyKind: BreakingStrategyKind;
	strategyLabel: string;
}

interface CachedRune {
	effect: string;
	rune: RuneData;
	runeNumerator: number;
	runeRealWeight: number;
}

export function normalizeStat(stat: string): string {
	return stat
		.toLocaleLowerCase('fr-FR')
		.replaceAll(/[^a-zàâçéèêëîïôûùüÿñæœ\s]/gi, '')
		.replace(/\bpo\b/, 'portée')
		.replace(/\bpa\b/, 'pa')
		.replace(/\bpm\b/, 'pm')
		.replace(/\b%?\s*critique(s)?\b/, 'critique')
		.replace(/\bdommage(s)? de poussée\b/, 'dommage poussée')
		.replace(/\bdommage(s)? critiques?\b/, 'dommage critiques')
		.replace(/\b%?\s*résistance(s)?\b/, 'résistance')
		.replace(/\b%?\s*dommage(s)?\b/, 'dommage')
		.replaceAll(/\s+/g, ' ')
		.trim();
}

export function calculateBreaking(item: BreakingItem, runes: RuneData[], requestedBreakRate: number): BreakingCalculationResult {
	const breakRate = Math.min(Math.max(Number.isFinite(requestedBreakRate) ? requestedBreakRate : 0, 0), 4000);
	const cachedRunes = buildCachedRunes(item, runes);
	const rows = cachedRunes.map((cached) => buildEffectResult(cached, cachedRunes, breakRate));
	const standardKamas = rows.reduce((sum, row) => sum + row.kamasEarned, 0);
	const bestFocusedRow = rows.reduce<BreakingEffectResult | null>(
		(best, row) => (!best || row.focusedKamasEarned > best.focusedKamasEarned ? row : best),
		null,
	);
	const bestFocusedKamas = bestFocusedRow?.focusedKamasEarned ?? 0;
	const bestWithoutFusionKamas = Math.max(standardKamas, bestFocusedKamas);

	let bestNonFocusedKamas = 0;
	const nonFocusedMerges: string[] = [];
	for (const row of rows) {
		bestNonFocusedKamas += Math.max(row.kamasEarned, row.basePaKamasEarned, row.baseRaKamasEarned);
		if (row.basePaKamasEarned > row.kamasEarned && row.basePaKamasEarned >= row.baseRaKamasEarned) {
			nonFocusedMerges.push(`Pa ${row.runeName}`);
		} else if (row.baseRaKamasEarned > row.kamasEarned) {
			nonFocusedMerges.push(`Ra ${row.runeName}`);
		}
	}

	const nonFocusedMergeLabel = nonFocusedMerges.length > 1 ? 'Plusieurs (voir tableau)' : nonFocusedMerges[0];
	let bestMerge: { name: string; value: number; focused: boolean } | null =
		nonFocusedMergeLabel && bestNonFocusedKamas > bestWithoutFusionKamas
			? { name: nonFocusedMergeLabel, value: bestNonFocusedKamas, focused: false }
			: null;

	for (const row of rows) {
		const candidates = [
			{ name: `Pa ${row.runeName}`, value: row.paKamasEarned },
			{ name: `Ra ${row.runeName}`, value: row.raKamasEarned },
		];
		for (const candidate of candidates) {
			if (candidate.value <= row.focusedKamasEarned || candidate.value <= bestWithoutFusionKamas) continue;
			if (!bestMerge || candidate.value > bestMerge.value) {
				bestMerge = { ...candidate, focused: true };
			}
		}
	}

	if (bestMerge) {
		return {
			rows,
			standardKamas,
			bestNonFocusedKamas,
			bestWithoutFusionKamas,
			bestFocusedKamas,
			bestKamas: bestMerge.value,
			mergeName: bestMerge.name,
			fusionKamas: bestMerge.value,
			nonFocusedMerges,
			strategyKind: 'fusion',
			strategyLabel: bestMerge.focused ? `Focus + fusion : ${bestMerge.name}` : `Fusion : ${bestMerge.name}`,
		};
	}

	const focusWins = bestFocusedKamas > standardKamas;
	return {
		rows,
		standardKamas,
		bestNonFocusedKamas,
		bestWithoutFusionKamas,
		bestFocusedKamas,
		bestKamas: bestWithoutFusionKamas,
		mergeName: 'Aucune',
		fusionKamas: 0,
		nonFocusedMerges,
		strategyKind: focusWins ? 'focus' : 'standard',
		strategyLabel: focusWins ? `Focus : ${bestFocusedRow?.runeName ?? 'Non déterminé'}` : 'Sans focus',
	};
}

function buildCachedRunes(item: BreakingItem, runes: RuneData[]): CachedRune[] {
	const level = Number(item.level);
	return item.effects
		.map((effect) => {
			const rune = findMatchingRune(effect, runes);
			if (!rune) return null;
			return {
				effect,
				rune,
				runeNumerator: (3 * rune.weight * calculateAverage(effect) * level) / 200 + 1,
				runeRealWeight: getRealRuneWeight(rune),
			};
		})
		.filter((cached): cached is CachedRune => cached !== null);
}

function buildEffectResult(cached: CachedRune, cachedRunes: CachedRune[], breakRate: number): BreakingEffectResult {
	const baseQuantity = (cached.runeNumerator * breakRate) / 100 / cached.runeRealWeight;
	const canFocus = !isUnfocusableRuneStat(cached.rune.stat);
	const focusedQuantity = !canFocus
		? 0
		: (cachedRunes.reduce(
				(sum, candidate) => sum + (candidate.effect === cached.effect ? candidate.runeNumerator : candidate.runeNumerator / 2),
				0,
			) /
				cached.runeRealWeight) *
			(breakRate / 100);
	const basePaQuantity = cached.rune.paPrice != null ? baseQuantity / PA_RUNE_RATIO : 0;
	const baseRaQuantity = cached.rune.raPrice != null ? baseQuantity / RA_RUNE_RATIO : 0;
	const focusedPaQuantity = cached.rune.paPrice != null ? focusedQuantity / PA_RUNE_RATIO : 0;
	const focusedRaQuantity = cached.rune.raPrice != null ? focusedQuantity / RA_RUNE_RATIO : 0;

	return {
		stat: cached.effect,
		runeName: cached.rune.name,
		canFocus,
		runePrice: cached.rune.price,
		paPrice: cached.rune.paPrice,
		raPrice: cached.rune.raPrice,
		runeImg: cached.rune.img,
		runeQuantity: baseQuantity.toFixed(2),
		kamasEarned: calculateKamas(baseQuantity, cached.rune.price),
		basePaKamasEarned: calculateKamas(basePaQuantity, cached.rune.paPrice),
		baseRaKamasEarned: calculateKamas(baseRaQuantity, cached.rune.raPrice),
		runeQuantityFocused: focusedQuantity.toFixed(2),
		focusedKamasEarned: calculateKamas(focusedQuantity, cached.rune.price),
		paRuneQuantity: focusedPaQuantity.toFixed(2),
		paKamasEarned: calculateKamas(focusedPaQuantity, cached.rune.paPrice),
		raRuneQuantity: focusedRaQuantity.toFixed(2),
		raKamasEarned: calculateKamas(focusedRaQuantity, cached.rune.raPrice),
	};
}

function findMatchingRune(itemStatistic: string, runes: RuneData[]): RuneData | undefined {
	const hasPercent = itemStatistic.includes('%');
	const normalizedItemStat = normalizeStat(itemStatistic);
	return runes
		.filter((rune) => {
			if (normalizedItemStat.includes('résistance')) {
				if (hasPercent && !rune.stat.startsWith('%')) return false;
				if (!hasPercent && rune.stat.startsWith('%')) return false;
			}
			return normalizedItemStat.includes(normalizeStat(rune.stat));
		})
		.sort((firstRune, secondRune) => secondRune.stat.length - firstRune.stat.length)[0];
}

function calculateAverage(value: string): number {
	const numbers = value.match(/\d+/g)?.map(Number) ?? [];
	if (numbers.length === 0) return 0;
	return numbers.reduce((sum, number) => sum + number, 0) / numbers.length;
}

function getRealRuneWeight(rune: RuneData): number {
	if (rune.stat === 'Vitalité' || rune.stat === 'Initiative') return 1;
	if (rune.stat === 'Pod') return 2.5;
	return rune.weight;
}

function calculateKamas(quantity: number, price?: number | null): number {
	return Math.round(quantity * (price ?? 0)) * SALE_TAX_MULTIPLIER;
}

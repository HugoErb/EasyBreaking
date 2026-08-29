import { findMatchingRune, normalizeStat } from './breaking-calculator';
import { RuneData } from './rune-data';

export type ExoticEffectKind = 'classic' | 'transcendence';

export interface ExoticEffectSelection {
	kind: ExoticEffectKind;
	stat: string;
	value: number;
	transcendenceRuneId?: number;
}

export interface TranscendenceRuneData {
	id: number;
	name: string;
	stat: string;
	value: number;
	density: 40 | 60 | 80;
}

export interface ExoticItemContext {
	effects: string[];
	isWeapon?: boolean;
}

const MAX_EXOTIC_WEIGHT = 101;
const WEIGHT_EPSILON = 1e-9;

export function isHuntingStat(stat: string): boolean {
	return normalizeStat(stat) === normalizeStat('Arme de chasse');
}

export function getRuneStatKey(stat: string): string {
	return `${stat.includes('%') ? 'percent' : 'flat'}:${normalizeStat(stat)}`;
}

export function formatExoticEffect(effect: ExoticEffectSelection): string {
	if (isHuntingStat(effect.stat)) return 'Arme de chasse';
	return `${effect.value} ${effect.stat}`;
}

export function getNaturalRuneStatKeys(item: ExoticItemContext, runes: RuneData[]): Set<string> {
	return new Set(
		(item.effects ?? [])
			.map((effect) => findMatchingRune(effect, runes)?.stat)
			.filter((stat): stat is string => Boolean(stat))
			.map((stat) => getRuneStatKey(stat)),
	);
}

export function findRuneByStat(stat: string, runes: RuneData[]): RuneData | undefined {
	const statKey = getRuneStatKey(stat);
	return runes.find((rune) => getRuneStatKey(rune.stat) === statKey);
}

export function getClassicExoticWeight(effects: ExoticEffectSelection[], runes: RuneData[]): number {
	return effects
		.filter((effect) => effect.kind === 'classic' && effect.stat)
		.reduce((total, effect) => {
			const rune = findRuneByStat(effect.stat, runes);
			return total + (rune ? rune.weight * (isHuntingStat(effect.stat) ? 1 : effect.value) : 0);
		}, 0);
}

export function getMaxClassicExoticValue(
	stat: string,
	effects: ExoticEffectSelection[],
	runes: RuneData[],
	ignoredIndex = -1,
): number {
	const rune = findRuneByStat(stat, runes);
	if (!rune) return 0;
	if (isHuntingStat(stat)) return 1;

	const usedWeight = effects.reduce((total, effect, index) => {
		if (index === ignoredIndex || effect.kind !== 'classic' || !effect.stat) return total;
		const effectRune = findRuneByStat(effect.stat, runes);
		return total + (effectRune ? effectRune.weight * (isHuntingStat(effect.stat) ? 1 : effect.value) : 0);
	}, 0);
	const remainingWeight = Math.max(0, MAX_EXOTIC_WEIGHT - usedWeight);
	return Math.max(0, Math.floor((remainingWeight + WEIGHT_EPSILON) / rune.weight));
}

export function sanitizeExoticEffects(
	item: ExoticItemContext,
	effects: ExoticEffectSelection[],
	runes: RuneData[],
	transcendenceRunes: TranscendenceRuneData[],
): ExoticEffectSelection[] {
	const naturalStats = getNaturalRuneStatKeys(item, runes);
	const selectedStats = new Set<string>();
	const sanitized: ExoticEffectSelection[] = [];
	let classicWeight = 0;
	let hasTranscendence = false;

	for (const effect of effects) {
		if (effect.kind === 'classic') {
			const rune = findRuneByStat(effect.stat, runes);
			if (!rune) continue;

			const statKey = getRuneStatKey(rune.stat);
			const hunting = isHuntingStat(rune.stat);
			const value = hunting ? 1 : Number(effect.value);
			if (naturalStats.has(statKey) || selectedStats.has(statKey)) continue;
			if (hunting && !item.isWeapon) continue;
			if (hasTranscendence && !hunting) continue;
			if (!Number.isInteger(value) || value <= 0) continue;

			const weight = rune.weight * value;
			if (classicWeight + weight > MAX_EXOTIC_WEIGHT + WEIGHT_EPSILON) continue;

			classicWeight += weight;
			selectedStats.add(statKey);
			sanitized.push({ kind: 'classic', stat: rune.stat, value });
			continue;
		}

		if (effect.kind !== 'transcendence' || hasTranscendence) continue;
		const reference = transcendenceRunes.find((rune) => rune.id === Number(effect.transcendenceRuneId));
		if (!reference) continue;

		const statKey = getRuneStatKey(reference.stat);
		if (naturalStats.has(statKey) || selectedStats.has(statKey)) continue;
		if (sanitized.some((candidate) => candidate.kind === 'classic' && !isHuntingStat(candidate.stat))) continue;

		hasTranscendence = true;
		selectedStats.add(statKey);
		sanitized.push({
			kind: 'transcendence',
			stat: reference.stat,
			value: reference.value,
			transcendenceRuneId: reference.id,
		});
	}

	return sanitized;
}

import {
	getClassicExoticWeight,
	sanitizeExoticEffects,
	TranscendenceRuneData,
} from './exotic-effects';
import { RuneData } from './rune-data';

describe('exotic effects', () => {
	const runes: RuneData[] = [
		{ name: 'Ga PA', stat: 'PA', img: 'pa.png', price: 1, weight: 100 },
		{ name: 'Ga Pme', stat: 'PM', img: 'pm.png', price: 1, weight: 90 },
		{ name: 'Vi', stat: 'Vitalité', img: 'vi.png', price: 1, weight: 0.2 },
		{ name: 'Fo', stat: 'Force', img: 'fo.png', price: 1, weight: 1 },
		{ name: 'Cha', stat: 'Chance', img: 'cha.png', price: 1, weight: 1 },
		{ name: 'Chasse', stat: 'Arme de chasse', img: 'chasse.png', price: 1, weight: 5 },
	];
	const transRunes: TranscendenceRuneData[] = [
		{ id: 1, name: 'Rune Ta Fo', stat: 'Force', value: 10, density: 40 },
	];
	const equipment = { effects: ['10 Chance'], isWeapon: false };

	it('accepts combinations up to 101 classic weight', () => {
		const paAndFiveVitality = sanitizeExoticEffects(
			equipment,
			[
				{ kind: 'classic', stat: 'PA', value: 1 },
				{ kind: 'classic', stat: 'Vitalité', value: 5 },
			],
			runes,
			transRunes,
		);
		const paAndSixVitality = sanitizeExoticEffects(
			equipment,
			[
				{ kind: 'classic', stat: 'PA', value: 1 },
				{ kind: 'classic', stat: 'Vitalité', value: 6 },
			],
			runes,
			transRunes,
		);

		expect(getClassicExoticWeight(paAndFiveVitality, runes)).toBe(101);
		expect(paAndFiveVitality.length).toBe(2);
		expect(paAndSixVitality).toEqual([{ kind: 'classic', stat: 'PA', value: 1 }]);
	});

	it('accepts PM plus 11 Force and rejects a twelfth point', () => {
		const valid = sanitizeExoticEffects(
			equipment,
			[
				{ kind: 'classic', stat: 'PM', value: 1 },
				{ kind: 'classic', stat: 'Force', value: 11 },
			],
			runes,
			transRunes,
		);
		const invalid = sanitizeExoticEffects(
			equipment,
			[
				{ kind: 'classic', stat: 'PM', value: 1 },
				{ kind: 'classic', stat: 'Force', value: 12 },
			],
			runes,
			transRunes,
		);

		expect(getClassicExoticWeight(valid, runes)).toBe(101);
		expect(valid.length).toBe(2);
		expect(invalid.length).toBe(1);
	});

	it('rejects natural characteristics, duplicates and hunting on equipment', () => {
		const result = sanitizeExoticEffects(
			equipment,
			[
				{ kind: 'classic', stat: 'Chance', value: 1 },
				{ kind: 'classic', stat: 'Force', value: 1 },
				{ kind: 'classic', stat: 'Force', value: 2 },
				{ kind: 'classic', stat: 'Arme de chasse', value: 1 },
			],
			runes,
			transRunes,
		);

		expect(result).toEqual([{ kind: 'classic', stat: 'Force', value: 1 }]);
	});

	it('allows hunting with one transcendence only on a weapon', () => {
		const effects = [
			{ kind: 'classic' as const, stat: 'Arme de chasse', value: 1 },
			{ kind: 'transcendence' as const, stat: 'Force', value: 10, transcendenceRuneId: 1 },
		];
		const weaponResult = sanitizeExoticEffects({ effects: ['10 Chance'], isWeapon: true }, effects, runes, transRunes);
		const equipmentResult = sanitizeExoticEffects(equipment, effects, runes, transRunes);

		expect(weaponResult.length).toBe(2);
		expect(equipmentResult).toEqual([
			{ kind: 'transcendence', stat: 'Force', value: 10, transcendenceRuneId: 1 },
		]);
	});

	it('rejects a transcendence combined with a non-hunting classic exo', () => {
		const result = sanitizeExoticEffects(
			equipment,
			[
				{ kind: 'classic', stat: 'Vitalité', value: 10 },
				{ kind: 'transcendence', stat: 'Force', value: 10, transcendenceRuneId: 1 },
			],
			runes,
			transRunes,
		);

		expect(result).toEqual([{ kind: 'classic', stat: 'Vitalité', value: 10 }]);
	});
});

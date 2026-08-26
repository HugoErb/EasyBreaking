import { BreakingItem, calculateBreaking } from './breaking-calculator';
import { RuneData } from './rune-data';

describe('calculateBreaking', () => {
	const forceRune: RuneData = {
		name: 'Fo',
		stat: 'Force',
		img: 'force.png',
		price: 100,
		weight: 1,
		paPrice: null,
		raPrice: null,
	};
	const baseItem: BreakingItem = {
		name: 'Objet test',
		image: 'item.png',
		type: 'Anneau',
		level: 100,
		effects: ['10 Force'],
	};

	it('applies the 2% sale tax and keeps standard strategy on a tie', () => {
		const result = calculateBreaking(baseItem, [forceRune], 100);

		expect(result.standardKamas).toBe(1568);
		expect(result.bestKamas).toBe(1568);
		expect(result.strategyKind).toBe('standard');
		expect(result.strategyLabel).toBe('Sans focus');
	});

	it('selects focus when it produces more value than the standard break', () => {
		const paRune: RuneData = {
			name: 'Ga Pa',
			stat: 'PA',
			img: 'pa.png',
			price: 100,
			weight: 100,
		};
		const result = calculateBreaking({ ...baseItem, effects: ['10 Force', '1 PA'] }, [forceRune, paRune], 100);

		expect(result.bestFocusedKamas).toBeGreaterThan(result.standardKamas);
		expect(result.strategyKind).toBe('focus');
		expect(result.strategyLabel).toBe('Focus : Fo');
	});

	it('selects a profitable Pa fusion', () => {
		const result = calculateBreaking(baseItem, [{ ...forceRune, paPrice: 400 }], 100);

		expect(result.bestNonFocusedKamas).toBeGreaterThan(result.standardKamas);
		expect(result.bestKamas).toBe(result.bestNonFocusedKamas);
		expect(result.mergeName).toBe('Pa Fo');
		expect(result.strategyLabel).toBe('Fusion : Pa Fo');
	});

	it('includes hunting runes in standard gains but prevents hunting focus', () => {
		const withHunting = { ...baseItem, effects: ['Arme de chasse', '10 Force'] };
		const huntingRune: RuneData = {
			name: 'Chasse',
			stat: 'Arme de chasse',
			img: 'hunting.png',
			price: 100,
			weight: 5,
		};
		const result = calculateBreaking(withHunting, [forceRune, huntingRune], 100);
		const withoutHunting = calculateBreaking(baseItem, [forceRune], 100);
		const huntingRow = result.rows.find((row) => row.runeName === 'Chasse');

		expect(result.rows.length).toBe(2);
		expect(result.standardKamas).toBeGreaterThan(withoutHunting.standardKamas);
		expect(huntingRow?.runeQuantity).not.toBe('0.00');
		expect(huntingRow?.runeQuantityFocused).toBe('0.00');
		expect(huntingRow?.focusedKamasEarned).toBe(0);
	});

	it('clamps the break rate to 4000%', () => {
		const cappedResult = calculateBreaking(baseItem, [forceRune], 5000);
		const expectedResult = calculateBreaking(baseItem, [forceRune], 4000);

		expect(cappedResult.bestKamas).toBe(expectedResult.bestKamas);
	});
});

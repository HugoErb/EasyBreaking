import { parseRunesData, readStoredRunes } from './rune-data';

describe('Rune data', () => {
	const validRune = {
		name: 'Fo',
		stat: 'Force',
		img: 'force.png',
		price: 100,
		weight: 1,
		paPrice: 350,
		raPrice: 1000,
	};

	afterEach(() => localStorage.removeItem('runesData'));

	it('accepts a complete rune list and normalizes numeric strings', () => {
		const runes = parseRunesData([{ ...validRune, price: '100', weight: '1' }]);

		expect(runes?.[0].price).toBe(100);
		expect(runes?.[0].weight).toBe(1);
	});

	it('rejects malformed rune lists', () => {
		expect(parseRunesData([])).toBeNull();
		expect(parseRunesData([{}])).toBeNull();
		expect(parseRunesData([{ ...validRune, weight: 0 }])).toBeNull();
		expect(parseRunesData([{ ...validRune, paPrice: -1 }])).toBeNull();
	});

	it('keeps hunting runes in parsed data', () => {
		const huntingRune = { ...validRune, name: 'Chasse', stat: 'Arme de chasse' };
		const runes = parseRunesData([
			validRune,
			huntingRune,
		]);

		expect(runes).toEqual([validRune, huntingRune]);
	});

	it('restores the hunting rune removed from stored data', () => {
		localStorage.setItem('runesData', JSON.stringify([validRune]));

		const runes = readStoredRunes();
		expect(runes?.map((rune) => rune.name)).toEqual(['Fo', 'Chasse']);
		expect(JSON.parse(localStorage.getItem('runesData') ?? '[]')).toEqual(runes);
	});

	it('ignores corrupted stored data', () => {
		localStorage.setItem('runesData', '{invalid-json');

		expect(readStoredRunes()).toBeNull();
	});
});

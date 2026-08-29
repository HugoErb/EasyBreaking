import { HttpClient } from '@angular/common/http';
import { of } from 'rxjs';
import { RunesManagerComponent } from './runes-manager.component';
import { TRANSCENDENCE_RUNE_PRICES_STORAGE_KEY } from '../transcendence-rune-prices';

describe('RunesManagerComponent', () => {
	const defaultRune = {
		name: 'Fo',
		stat: 'Force',
		img: 'force.png',
		price: 100,
		weight: 1,
		paPrice: 350,
		raPrice: 1000,
	};

	afterEach(() => {
		localStorage.removeItem('runesData');
		localStorage.removeItem(TRANSCENDENCE_RUNE_PRICES_STORAGE_KEY);
	});

	it('restores bundled rune data when local storage is corrupted', () => {
		localStorage.setItem('runesData', '{invalid-json');
		const http = { get: () => of([defaultRune]) } as unknown as HttpClient;
		const component = new RunesManagerComponent(http);

		component.loadRunes();

		expect(component.runes).toEqual([defaultRune]);
		expect(JSON.parse(localStorage.getItem('runesData') ?? '[]')).toEqual([defaultRune]);
	});

	it('takes accents into account when sorting rune names', () => {
		const http = {} as HttpClient;
		const component = new RunesManagerComponent(http);
		component.runes = [
			{ ...defaultRune, name: 'Ré' },
			{ ...defaultRune, name: 'Re' },
		];

		component.sortBy('name');
		component.sortBy('name');

		expect(component.runes.map((rune) => rune.name)).toEqual(['Re', 'Ré']);
	});

	it('uses the locally stored rune image', () => {
		const component = new RunesManagerComponent({} as HttpClient);

		expect(component.getRuneImagePath('Ré Per Terre')).toBe('assets/imgs/runes/re-per-terre.png');
	});

	it('loads and stores transcendence rune prices', () => {
		localStorage.setItem(TRANSCENDENCE_RUNE_PRICES_STORAGE_KEY, JSON.stringify({ 20492: 125_000 }));
		const transRune = { id: 20492, name: 'Rune Ta Ine', stat: 'Intelligence', value: 10, density: 40 as const };
		const http = { get: () => of([transRune]) } as unknown as HttpClient;
		const component = new RunesManagerComponent(http);

		component.loadTranscendenceRunes();
		expect(component.transcendenceRunes[0].price).toBe(125_000);

		component.onTranscendencePriceChange(0, 150_000);
		expect(JSON.parse(localStorage.getItem(TRANSCENDENCE_RUNE_PRICES_STORAGE_KEY) ?? '{}')['20492']).toBe(150_000);
	});

	it('sorts transcendence runes by name, effect and price', () => {
		const component = new RunesManagerComponent({} as HttpClient);
		component.transcendenceRunes = [
			{ id: 1, name: 'Rune Ta Fo', stat: 'Force', value: 10, density: 40, price: 200 },
			{ id: 2, name: 'Rune Ta Ine', stat: 'Intelligence', value: 10, density: 40, price: 100 },
		];

		component.sortTranscendenceBy('price');
		expect(component.transcendenceRunes.map((rune) => rune.id)).toEqual([2, 1]);

		component.sortTranscendenceBy('price');
		expect(component.transcendenceRunes.map((rune) => rune.id)).toEqual([1, 2]);

		component.sortTranscendenceBy('effect');
		expect(component.transcendenceRunes.map((rune) => rune.stat)).toEqual(['Force', 'Intelligence']);
	});
});

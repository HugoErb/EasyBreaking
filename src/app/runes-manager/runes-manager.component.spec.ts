import { HttpClient } from '@angular/common/http';
import { of } from 'rxjs';
import { RunesManagerComponent } from './runes-manager.component';

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

	afterEach(() => localStorage.removeItem('runesData'));

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
});

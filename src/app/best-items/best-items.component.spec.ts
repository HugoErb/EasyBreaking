import { ChangeDetectorRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { BreakingItem } from '../breaking-calculator';
import { RuneData } from '../rune-data';
import { BestItemsComponent } from './best-items.component';

describe('BestItemsComponent', () => {
	const rune: RuneData = {
		name: 'Fo',
		stat: 'Force',
		img: 'force.png',
		price: 100,
		weight: 1,
	};

	function item(name: string, level: number, type = 'Anneau'): BreakingItem {
		return {
			name,
			level,
			type,
			image: `${name}.png`,
			effects: ['10 Force'],
			recipe: [],
		};
	}

	function createComponent(items: BreakingItem[]) {
		const http = {
			get: jasmine.createSpy('get').and.callFake((url: string) => {
				if (url.endsWith('runes.json')) return of([rune]);
				if (url.endsWith('armes.json')) return of(items);
				return of([]);
			}),
		} as unknown as HttpClient;
		const router = {
			createUrlTree: jasmine.createSpy('createUrlTree').and.returnValue({}),
			serializeUrl: jasmine.createSpy('serializeUrl').and.returnValue('/?item=Alpha&breakRate=100'),
		} as unknown as Router;
		const cdr = { markForCheck: () => undefined } as unknown as ChangeDetectorRef;
		return { component: new BestItemsComponent(http, router, cdr), router };
	}

	afterEach(() => localStorage.clear());

	it('loads bundled runes, deduplicates items and keeps the 50 best results', () => {
		const items = Array.from({ length: 101 }, (_, index) => item(`Item ${index + 1}`, index + 1));
		items.push({ ...items[0], effects: [...items[0].effects], recipe: [] });
		const { component } = createComponent(items);

		component.ngOnInit();

		expect(component.filteredTotal).toBe(101);
		expect(component.displayedResults.length).toBe(50);
		expect(component.displayedResults[0].item.level).toBe(101);
		expect(JSON.parse(localStorage.getItem('runesData') ?? '[]')).toEqual([rune]);
	});

	it('uses stored rune prices and filters by name, level and multiple types', () => {
		localStorage.setItem('runesData', JSON.stringify([{ ...rune, price: 250 }]));
		const { component } = createComponent([
			item('Anneau Alpha', 50),
			item('Épée Beta', 120, 'Épée'),
			item('Marteau Beta', 130, 'Marteau'),
			item('Cape Beta', 140, 'Cape'),
		]);
		component.ngOnInit();
		component.searchTerm = 'beta';
		component.minimumLevel = 100;
		component.maximumLevel = 150;
		component.selectedTypes = ['Épée', 'Marteau'];

		component.onFiltersChange();

		expect(component.displayedResults.map((result) => result.item.name)).toEqual(['Marteau Beta', 'Épée Beta']);
		expect(component.displayedResults.every((result) => result.calculation.rows[0].runePrice === 250)).toBeTrue();
	});

	it('sorts the top results and opens the calculator with query parameters', () => {
		const { component, router } = createComponent([item('Zulu', 10), item('Alpha', 20)]);
		spyOn(window, 'open');
		component.ngOnInit();
		component.sortBy('name');

		expect(component.displayedResults.map((result) => result.item.name)).toEqual(['Alpha', 'Zulu']);
		component.openItem(component.displayedResults[0]);
		expect(router.createUrlTree).toHaveBeenCalledWith(['/'], {
			queryParams: { item: 'Alpha', breakRate: 100 },
		});
		expect(window.open).toHaveBeenCalledWith('/?item=Alpha&breakRate=100', '_blank', 'noopener,noreferrer');
	});
});

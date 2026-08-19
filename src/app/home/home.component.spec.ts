import { ChangeDetectorRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { HomeComponent } from './home.component';
import { SearchHistoryService } from '../search-history/search-history.service';

describe('HomeComponent', () => {
	function createComponent(): HomeComponent {
		return new HomeComponent(
			{} as HttpClient,
			{
				detectChanges: () => undefined,
				markForCheck: () => undefined,
			} as unknown as ChangeDetectorRef,
			{
				recordSearch: () => 'history-id',
				updateEntry: () => undefined,
			} as unknown as SearchHistoryService,
		);
	}

	it("updates the recipe item count when an item estimate is calculated before non-profitability", () => {
		const component = createComponent();
		component.selectedItem = { level: 104 };
		component.tauxBrisage = 105;
		component.prixCraft = 100;
		component.maxValue = 200;
		component.mergeRune = 'Aucune';
		spyOn(component, 'findNorProfitableBreakRate').and.returnValue(100);

		(component as unknown as { computeRentabilities: () => void }).computeRentabilities();

		expect(component.estimatedItemsBeforeNotProfitable).toBe(5);
		expect(component.nombreObjets).toBe(5);
	});

	it('records kamasEarned and profitPercentage in history update when prices and break rate are present', () => {
		const searchHistoryService = {
			recordSearch: () => 'history-123',
			updateEntry: jasmine.createSpy('updateEntry'),
		} as unknown as SearchHistoryService;

		const component = new HomeComponent(
			{} as HttpClient,
			{
				detectChanges: () => undefined,
				markForCheck: () => undefined,
			} as unknown as ChangeDetectorRef,
			searchHistoryService,
		);

		component['currentHistoryId'] = 'history-123';
		component.tauxBrisage = 150;
		component.prixCraft = 100_000;
		component.sumKamasEarned = 120_000;
		component.maxFocusedKamasEarned = 150_000;
		component.tableauEffects = [
			{ focusedKamasEarned: 150_000, runeName: 'Rune Fo' },
		];
		component.mergeRune = 'Aucune';

		(component as unknown as { updateCurrentHistory: () => void })['updateCurrentHistory']();

		expect(searchHistoryService.updateEntry).toHaveBeenCalledWith('history-123', {
			breakRate: 150,
			craftPrice: 100_000,
			profitable: true,
			kamasEarned: 150_000,
			profitPercentage: 50,
			focus: 'Rune Fo',
		});
	});

	it('pre-fills item and economic parameters when a prefilled history entry is consumed', () => {
		const prefilled = {
			historyId: 'history-voile',
			name: "Voile d'encre",
			image: 'voile.png',
			level: 200,
			type: 'Cape',
			breakRate: 180,
			craftPrice: 1_200_000,
			profitable: true,
			kamasEarned: 1_800_000,
			profitPercentage: 50,
			focus: 'Rune Fo',
			updatedAt: '2026-08-19T10:00:00.000Z',
		};

		const searchHistoryService = {
			consumePrefilledEntry: () => prefilled,
			recordSearch: () => 'history-voile',
			updateEntry: jasmine.createSpy('updateEntry'),
		} as unknown as SearchHistoryService;

		const component = new HomeComponent(
			{} as HttpClient,
			{
				detectChanges: () => undefined,
				markForCheck: () => undefined,
			} as unknown as ChangeDetectorRef,
			searchHistoryService,
		);

		component.items = [
			{
				id: 1,
				name: "Voile d'encre",
				nameLower: "voile d'encre",
				level: 200,
				effects: ['100 Force'],
				recipe: [],
				type: 'Cape',
			},
		];
		component.runes = [
			{
				name: 'Rune Fo',
				stat: 'Force',
				normalizedStat: 'force',
				price: '100',
				weight: 1,
			},
		];

		spyOn(component, 'unVanishDiv').and.stub();
		spyOn(component, 'findNorProfitableBreakRate').and.returnValue(100);

		(component as unknown as { checkAndApplyPrefilledEntry: () => void })['checkAndApplyPrefilledEntry']();

		expect(component.selectedItem?.name).toBe("Voile d'encre");
		expect(component['currentHistoryId']).toBe('history-voile');
		expect(component.tauxBrisage).toBe(180);
		expect(component.prixCraft).toBe(1_200_000);
		expect(component.unVanishDiv).toHaveBeenCalled();
	});
});

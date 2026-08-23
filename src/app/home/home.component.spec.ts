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
			updateEntry: jasmine.createSpy('updateEntry').and.returnValue('history-456'),
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
		expect(component['currentHistoryId']).toBe('history-456');
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

	it('selects the most valuable profitable merge across every effect', () => {
		const component = createComponent();
		component.tauxBrisage = 100;
		component.maxValue = 250;
		component.tableauEffects = [
			{ runeName: 'Rune A', focusedKamasEarned: 200, paKamasEarned: 250, raKamasEarned: 220 },
			{ runeName: 'Rune B', focusedKamasEarned: 180, paKamasEarned: 190, raKamasEarned: 320 },
		];

		(component as unknown as { determineBestMergeRune: () => void }).determineBestMergeRune();

		expect(component.mergeRune).toBe('Ra Rune B');
		expect(component.maxValuePaRa).toBe(320);
	});

	it('does not recommend a merge when the standard total is more valuable', () => {
		const component = createComponent();
		component.tauxBrisage = 100;
		component.maxValue = 500;
		component.tableauEffects = [
			{ runeName: 'Rune A', focusedKamasEarned: 200, paKamasEarned: 300, raKamasEarned: 250 },
		];

		(component as unknown as { determineBestMergeRune: () => void }).determineBestMergeRune();

		expect(component.mergeRune).toBe('Aucune');
		expect(component.maxValuePaRa).toBe(0);
	});

	it('uses nine standard runes for one Ra rune', () => {
		const component = createComponent();
		component.selectedItem = { level: 100, effects: ['10 Force'], recipe: [] };
		component.runes = [
			{
				name: 'Fo',
				stat: 'Force',
				normalizedStat: 'force',
				price: 1,
				paPrice: 4,
				raPrice: 10,
				weight: 1,
				img: 'force.png',
			},
		];

		(component as unknown as { initCachedRunes: () => void }).initCachedRunes();
		(component as unknown as { buildTableAndTotals: () => void }).buildTableAndTotals();

		const row = component.tableauEffects[0];
		expect(row.basePaKamasEarned).toBeGreaterThan(0);
		expect(row.baseRaKamasEarned).toBeGreaterThan(0);
		expect(row.paKamasEarned).toBeGreaterThan(0);
		expect(row.raKamasEarned).toBeGreaterThan(0);
		expect(component.sumBestChoicesKamasEarned).toBe(Math.max(row.kamasEarned, row.basePaKamasEarned, row.baseRaKamasEarned));
		expect(Number.parseFloat(row.raRuneQuantity)).toBeCloseTo(Number.parseFloat(row.runeQuantityFocused) / 9, 2);
	});

	it('keeps the standard value in the best choices sum when both merges are lower', () => {
		const component = createComponent();
		component.selectedItem = { level: 100, effects: ['10 Force'], recipe: [] };
		component.runes = [
			{
				name: 'Fo',
				stat: 'Force',
				normalizedStat: 'force',
				price: 100,
				paPrice: 100,
				raPrice: 100,
				weight: 1,
				img: 'force.png',
			},
		];

		(component as unknown as { initCachedRunes: () => void }).initCachedRunes();
		(component as unknown as { buildTableAndTotals: () => void }).buildTableAndTotals();

		expect(component.sumBestChoicesKamasEarned).toBe(component.tableauEffects[0].kamasEarned);
	});

	it('recommends profitable merges without focus when their combined value is the best strategy', () => {
		const component = createComponent();
		component.prixCraft = 100;
		component.selectedItem = { level: 100, effects: ['10 Force', '10 Chance'], recipe: [] };
		component.runes = [
			{
				name: 'Fo',
				stat: 'Force',
				normalizedStat: 'force',
				price: 100,
				paPrice: 400,
				raPrice: null,
				weight: 1,
				img: 'force.png',
			},
			{
				name: 'Cha',
				stat: 'Chance',
				normalizedStat: 'chance',
				price: 100,
				paPrice: null,
				raPrice: null,
				weight: 1,
				img: 'chance.png',
			},
		];

		(component as unknown as { initCachedRunes: () => void }).initCachedRunes();
		(component as unknown as { buildTableAndTotals: () => void }).buildTableAndTotals();

		expect(component.mergeRune).toBe('Sans focus : Pa Fo');
		expect(component.maxValuePaRa).toBe(component.sumBestChoicesKamasEarned);
		expect(component.calculateBenefit(100, true)).toBe(Math.round(component.sumBestChoicesKamasEarned - component.prixCraft));
	});

	it('returns null when no break rate is profitable', () => {
		const component = createComponent();
		spyOn(component, 'calculateBenefit').and.returnValue(-1);

		expect(component.findNorProfitableBreakRate(false)).toBeNull();
	});
});

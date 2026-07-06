import { ChangeDetectorRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { HomeComponent } from './home.component';

describe('HomeComponent', () => {
	function createComponent(): HomeComponent {
		return new HomeComponent(
			{} as HttpClient,
			{
				detectChanges: () => undefined,
				markForCheck: () => undefined,
			} as unknown as ChangeDetectorRef,
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
});

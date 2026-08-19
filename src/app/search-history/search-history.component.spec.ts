import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { SearchHistoryComponent } from './search-history.component';
import { SearchHistoryEntry, SearchHistoryService } from './search-history.service';

describe('SearchHistoryComponent', () => {
	let component: SearchHistoryComponent;
	let service: SearchHistoryService;
	let router: jasmine.SpyObj<Router>;

	const mockEntries: SearchHistoryEntry[] = [
		{
			historyId: '1',
			name: "Voile d'encre",
			image: 'voile.png',
			level: 200,
			type: 'Cape',
			breakRate: 150,
			craftPrice: 1_000_000,
			profitable: true,
			kamasEarned: 1_500_000,
			profitPercentage: 50,
			focus: 'Rune Fo',
			updatedAt: '2026-08-19T10:00:00.000Z',
		},
		{
			historyId: '2',
			name: 'Coiffe du Bouftou',
			image: 'bouf.png',
			level: 20,
			type: 'Chapeau',
			breakRate: 80,
			craftPrice: 10_000,
			profitable: false,
			kamasEarned: 7_000,
			profitPercentage: -30,
			focus: 'Sans focus',
			updatedAt: '2026-08-19T11:00:00.000Z',
		},
	];

	beforeEach(() => {
		const routerSpy = jasmine.createSpyObj('Router', ['navigate']);
		const serviceSpy = jasmine.createSpyObj('SearchHistoryService', ['getEntries', 'deleteEntry', 'setPrefilledEntry']);
		serviceSpy.getEntries.and.returnValue([...mockEntries]);

		TestBed.configureTestingModule({
			declarations: [SearchHistoryComponent],
			imports: [ButtonModule, TooltipModule],
			providers: [
				{ provide: SearchHistoryService, useValue: serviceSpy },
				{ provide: Router, useValue: routerSpy },
			],
		});

		service = TestBed.inject(SearchHistoryService);
		router = TestBed.inject(Router) as jasmine.SpyObj<Router>;
		const fixture = TestBed.createComponent(SearchHistoryComponent);
		component = fixture.componentInstance;
		component.ngOnInit();
	});

	it('loads entries on init', () => {
		expect(component.history.length).toBe(2);
		expect(component.history[0].name).toBe("Voile d'encre");
	});

	it('navigates to home page on goToHomePage', () => {
		component.goToHomePage();
		expect(router.navigate).toHaveBeenCalledWith(['']);
	});

	it('deletes entry from service and local state', () => {
		component.deleteEntry('1');
		expect(service.deleteEntry).toHaveBeenCalledWith('1');
		expect(component.history.length).toBe(1);
		expect(component.history[0].historyId).toBe('2');
	});

	it('sorts by profitable / profit percentage', () => {
		component.sortBy('profitable');
		expect(component.history[0].historyId).toBe('2'); // -30% before 50% in asc
		expect(component.history[1].historyId).toBe('1');

		component.sortBy('profitable');
		expect(component.history[0].historyId).toBe('1'); // 50% before -30% in desc
		expect(component.history[1].historyId).toBe('2');
	});

	it('sorts by name', () => {
		component.sortBy('name');
		expect(component.history[0].name).toBe('Coiffe du Bouftou');
		expect(component.history[1].name).toBe("Voile d'encre");
	});

	it('sets prefilled entry and navigates to home on launchWithEntry', () => {
		const entry = mockEntries[0];
		component.launchWithEntry(entry);

		expect(service.setPrefilledEntry).toHaveBeenCalledWith(entry);
		expect(router.navigate).toHaveBeenCalledWith(['']);
	});
});

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { RouterTestingModule } from '@angular/router/testing';
import { ButtonModule } from 'primeng/button';
import { Tooltip, TooltipModule } from 'primeng/tooltip';
import { SearchHistoryComponent } from './search-history.component';
import { SearchHistoryEntry, SearchHistoryService } from './search-history.service';

describe('SearchHistoryComponent', () => {
	let component: SearchHistoryComponent;
	let fixture: ComponentFixture<SearchHistoryComponent>;
	let service: SearchHistoryService;

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
		const serviceSpy = jasmine.createSpyObj('SearchHistoryService', ['getEntries', 'deleteEntry']);
		serviceSpy.getEntries.and.returnValue([...mockEntries]);

		TestBed.configureTestingModule({
			declarations: [SearchHistoryComponent],
			imports: [ButtonModule, TooltipModule, RouterTestingModule],
			providers: [
				{ provide: SearchHistoryService, useValue: serviceSpy },
			],
		});

		service = TestBed.inject(SearchHistoryService);
		fixture = TestBed.createComponent(SearchHistoryComponent);
		component = fixture.componentInstance;
		component.ngOnInit();
	});

	it('loads entries on init', () => {
		expect(component.history.length).toBe(2);
		expect(component.history[0].name).toBe("Voile d'encre");
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

	it('shows only the most recently updated line for each distinct item', () => {
		const latestVoileEntry: SearchHistoryEntry = {
			...mockEntries[0],
			historyId: '3',
			breakRate: 175,
			updatedAt: '2026-08-20T10:00:00.000Z',
		};
		(service.getEntries as jasmine.Spy).and.returnValue([mockEntries[0], mockEntries[1], latestVoileEntry]);
		component.ngOnInit();

		component.toggleDistinctItems();

		expect(component.showDistinctItems).toBeTrue();
		expect(component.history.length).toBe(2);
		expect(component.history.find((entry) => entry.name === "Voile d'encre")?.historyId).toBe('3');

		component.toggleDistinctItems();
		expect(component.history.length).toBe(3);
	});

	it('exposes calculator navigation as a link containing the history identifier', () => {
		fixture.detectChanges();
		const calculatorLink = fixture.nativeElement.querySelector('a[aria-label="Ouvrir dans le calculateur"]') as HTMLAnchorElement;

		expect(calculatorLink.getAttribute('href')).toContain('historyId=1');
	});

	it('explains the five-minute history rule on the date column', () => {
		fixture.detectChanges();
		const dateTooltip = fixture.debugElement
			.queryAll(By.directive(Tooltip))
			.map((element) => element.injector.get(Tooltip))
			.find((tooltip) => String(tooltip.content).startsWith('Un même item reste sur une seule ligne'));

		expect(dateTooltip?.content).toBe(
			'Un même item reste sur une seule ligne pendant 5 min après sa dernière mise à jour. Passé ce délai, une nouvelle ligne est créée.',
		);
		expect(dateTooltip?.tooltipStyleClass).toBe('history-date-tooltip');
		expect(dateTooltip?.tooltipPosition).toBe('top');
	});
});

import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { forkJoin, map, of, tap } from 'rxjs';
import { BreakingCalculationResult, BreakingItem, calculateBreaking } from '../breaking-calculator';
import { parseRunesData, readStoredRunes, RuneData, storeRunes } from '../rune-data';

type SortColumn = 'gain' | 'level' | 'name';
type SortDirection = 'asc' | 'desc';

export interface RankedBreakingItem {
	item: BreakingItem;
	calculation: BreakingCalculationResult;
	profitRank: number;
}

@Component({
	selector: 'app-best-items',
	templateUrl: './best-items.component.html',
	styleUrls: ['./best-items.component.scss'],
	changeDetection: ChangeDetectionStrategy.OnPush,
	standalone: false,
})
export class BestItemsComponent implements OnInit {
	breakRate: number | null = 100;
	searchTerm = '';
	minimumLevel: number | null = 1;
	maximumLevel: number | null = 200;
	selectedTypes: string[] = [];
	types: string[] = [];
	displayedResults: RankedBreakingItem[] = [];
	filteredTotal = 0;
	loading = true;
	loadError = false;
	sortColumn: SortColumn = 'gain';
	sortDirection: SortDirection = 'desc';

	private items: BreakingItem[] = [];
	private runes: RuneData[] = [];
	private calculatedItems: RankedBreakingItem[] = [];

	constructor(
		private readonly http: HttpClient,
		private readonly router: Router,
		private readonly cdr: ChangeDetectorRef,
	) {}

	ngOnInit(): void {
		const storedRunes = readStoredRunes();
		const runes$ = storedRunes
			? of(storedRunes)
			: this.http.get<unknown>('assets/jsons/runes.json').pipe(
					map((data) => {
						const runes = parseRunesData(data);
						if (!runes) throw new Error('Le fichier de runes par défaut est invalide.');
						return runes;
					}),
					tap((runes) => storeRunes(runes)),
				);

		forkJoin([
			runes$,
			this.http.get<BreakingItem[]>('assets/jsons/armes.json'),
			this.http.get<BreakingItem[]>('assets/jsons/equipements.json'),
		]).subscribe({
			next: ([runes, weapons, equipment]) => {
				this.runes = runes;
				this.items = this.deduplicateItems([...weapons, ...equipment]);
				this.types = [...new Set(this.items.map((item) => item.type))].sort((a, b) => a.localeCompare(b, 'fr'));
				this.recalculateItems();
				this.loading = false;
				this.cdr.markForCheck();
			},
			error: () => {
				this.loading = false;
				this.loadError = true;
				this.cdr.markForCheck();
			},
		});
	}

	onBreakRateChange(): void {
		this.breakRate = Math.min(Math.max(this.breakRate ?? 0, 0), 4000);
		this.recalculateItems();
	}

	onFiltersChange(): void {
		this.refreshDisplayedResults();
	}

	sortBy(column: SortColumn): void {
		if (this.sortColumn === column) {
			this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
		} else {
			this.sortColumn = column;
			this.sortDirection = column === 'gain' ? 'desc' : 'asc';
		}
		this.applyDisplaySort();
	}

	getSortIcon(column: SortColumn): string {
		if (this.sortColumn !== column) return 'pi pi-sort-alt';
		return this.sortDirection === 'asc' ? 'pi pi-sort-amount-up' : 'pi pi-sort-amount-down';
	}

	getAriaSort(column: SortColumn): 'ascending' | 'descending' | 'none' {
		if (this.sortColumn !== column) return 'none';
		return this.sortDirection === 'asc' ? 'ascending' : 'descending';
	}

	openItem(result: RankedBreakingItem): void {
		const url = this.router.serializeUrl(this.router.createUrlTree(['/'], {
			queryParams: { item: result.item.name, breakRate: this.breakRate ?? 0 },
		}));
		window.open(url, '_blank', 'noopener,noreferrer');
	}

	private recalculateItems(): void {
		if (this.items.length === 0 || this.runes.length === 0) return;
		const breakRate = this.breakRate ?? 0;
		this.calculatedItems = this.items.map((item) => ({
			item,
			calculation: calculateBreaking(item, this.runes, breakRate),
			profitRank: 0,
		}));
		this.refreshDisplayedResults();
		this.cdr.markForCheck();
	}

	private refreshDisplayedResults(): void {
		const query = this.searchTerm.trim().toLocaleLowerCase('fr-FR');
		const minimumLevel = this.minimumLevel ?? 1;
		const maximumLevel = this.maximumLevel ?? 200;
		const filtered = this.calculatedItems.filter(({ item }) => {
			const level = Number(item.level);
			return (
				item.name.toLocaleLowerCase('fr-FR').includes(query) &&
				level >= minimumLevel &&
				level <= maximumLevel &&
				(this.selectedTypes.length === 0 || this.selectedTypes.includes(item.type))
			);
		});
		this.filteredTotal = filtered.length;

		this.displayedResults = [...filtered]
			.sort((first, second) => this.compareByGain(first, second))
			.slice(0, 50)
			.map((result, index) => ({ ...result, profitRank: index + 1 }));
		this.applyDisplaySort();
		this.cdr.markForCheck();
	}

	private applyDisplaySort(): void {
		const direction = this.sortDirection === 'asc' ? 1 : -1;
		this.displayedResults = [...this.displayedResults].sort((first, second) => {
			let comparison = 0;
			if (this.sortColumn === 'gain') comparison = first.calculation.bestKamas - second.calculation.bestKamas;
			if (this.sortColumn === 'level') comparison = Number(first.item.level) - Number(second.item.level);
			if (this.sortColumn === 'name') comparison = first.item.name.localeCompare(second.item.name, 'fr', { sensitivity: 'base' });
			return comparison === 0 ? first.profitRank - second.profitRank : comparison * direction;
		});
	}

	private compareByGain(first: RankedBreakingItem, second: RankedBreakingItem): number {
		const gainDifference = second.calculation.bestKamas - first.calculation.bestKamas;
		return gainDifference || first.item.name.localeCompare(second.item.name, 'fr', { sensitivity: 'base' });
	}

	private deduplicateItems(items: BreakingItem[]): BreakingItem[] {
		const seen = new Set<string>();
		return items.filter((item) => {
			const signature = JSON.stringify([
				item.name,
				item.image,
				item.type,
				item.level,
				item.set,
				item.effects,
				item.recipe,
			]);
			if (seen.has(signature)) return false;
			seen.add(signature);
			return true;
		});
	}
}

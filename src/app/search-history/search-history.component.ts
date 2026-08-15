import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { SearchHistoryEntry, SearchHistoryService } from './search-history.service';

type HistorySortColumn = 'name' | 'level' | 'type' | 'breakRate' | 'craftPrice' | 'profitable' | 'focus' | 'updatedAt';
type SortDirection = 'asc' | 'desc';

@Component({
	selector: 'app-search-history',
	templateUrl: './search-history.component.html',
	styleUrls: ['./search-history.component.scss'],
	standalone: false,
})
export class SearchHistoryComponent implements OnInit {
	history: SearchHistoryEntry[] = [];
	sortColumn: HistorySortColumn | null = null;
	sortDirection: SortDirection = 'asc';

	constructor(
		private readonly searchHistoryService: SearchHistoryService,
		private readonly router: Router,
	) {}

	ngOnInit(): void {
		this.history = this.searchHistoryService.getEntries();
	}

	goToHomePage(): void {
		void this.router.navigate(['']);
	}

	deleteEntry(historyId: string): void {
		this.searchHistoryService.deleteEntry(historyId);
		this.history = this.history.filter((entry) => entry.historyId !== historyId);
	}

	sortBy(column: HistorySortColumn): void {
		this.sortDirection = this.sortColumn === column && this.sortDirection === 'asc' ? 'desc' : 'asc';
		this.sortColumn = column;

		this.history = [...this.history].sort((firstEntry, secondEntry) => {
			const firstValue = firstEntry[column];
			const secondValue = secondEntry[column];

			if (firstValue == null && secondValue == null) return 0;
			if (firstValue == null) return 1;
			if (secondValue == null) return -1;

			const comparison =
				typeof firstValue === 'number' && typeof secondValue === 'number'
					? firstValue - secondValue
					: String(firstValue).localeCompare(String(secondValue), 'fr', { numeric: true, sensitivity: 'base' });
			return this.sortDirection === 'asc' ? comparison : -comparison;
		});
	}

	getSortIcon(column: HistorySortColumn): string {
		if (this.sortColumn !== column) return 'pi pi-sort-alt';
		return this.sortDirection === 'asc' ? 'pi pi-sort-amount-up' : 'pi pi-sort-amount-down';
	}

	getAriaSort(column: HistorySortColumn): 'ascending' | 'descending' | 'none' {
		if (this.sortColumn !== column) return 'none';
		return this.sortDirection === 'asc' ? 'ascending' : 'descending';
	}
}

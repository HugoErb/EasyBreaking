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
	showDistinctItems = false;
	sortColumn: HistorySortColumn | null = null;
	sortDirection: SortDirection = 'asc';
	private allHistory: SearchHistoryEntry[] = [];

	constructor(
		private readonly searchHistoryService: SearchHistoryService,
		private readonly router: Router,
	) {}

	ngOnInit(): void {
		this.allHistory = this.searchHistoryService.getEntries();
		this.refreshDisplayedHistory();
	}

	goToHomePage(): void {
		void this.router.navigate(['']);
	}

	launchWithEntry(entry: SearchHistoryEntry): void {
		this.searchHistoryService.setPrefilledEntry(entry);
		void this.router.navigate(['']);
	}

	deleteEntry(historyId: string): void {
		this.searchHistoryService.deleteEntry(historyId);
		this.allHistory = this.allHistory.filter((entry) => entry.historyId !== historyId);
		this.refreshDisplayedHistory();
	}

	toggleDistinctItems(): void {
		this.showDistinctItems = !this.showDistinctItems;
		this.refreshDisplayedHistory();
	}

	exportToCsv(): void {
		const headers = [
			'Item',
			'Niveau',
			'Type',
			'Taux de brisage (%)',
			'Prix du craft (k)',
			'Rentabilité',
			'Kamas gagnés (k)',
			'Bénéfice (%)',
			'Meilleur focus',
			'Date',
		];
		const rows = this.history.map((entry) => [
			entry.name,
			entry.level,
			entry.type,
			entry.breakRate,
			entry.craftPrice,
			entry.profitable === true ? 'Rentable' : entry.profitable === false ? 'Non rentable' : 'Non déterminée',
			entry.kamasEarned,
			entry.profitPercentage,
			entry.focus,
			this.formatCsvDate(entry.updatedAt),
		]);
		const csv = [headers, ...rows].map((row) => row.map((value) => this.escapeCsvValue(value)).join(';')).join('\r\n');
		const blob = new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' });
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');

		link.href = url;
		link.download = `historique-brisage-${new Date().toISOString().slice(0, 10)}.csv`;
		link.click();
		URL.revokeObjectURL(url);
	}

	sortBy(column: HistorySortColumn): void {
		this.sortDirection = this.sortColumn === column && this.sortDirection === 'asc' ? 'desc' : 'asc';
		this.sortColumn = column;
		this.refreshDisplayedHistory();
	}

	private sortEntries(entries: SearchHistoryEntry[], column: HistorySortColumn): SearchHistoryEntry[] {
		return [...entries].sort((firstEntry, secondEntry) => {
			if (column === 'profitable') {
				const firstProfit =
					firstEntry.profitPercentage != null
						? firstEntry.profitPercentage
						: firstEntry.profitable === true
							? Number.MAX_SAFE_INTEGER
							: firstEntry.profitable === false
								? -Number.MAX_SAFE_INTEGER
								: null;
				const secondProfit =
					secondEntry.profitPercentage != null
						? secondEntry.profitPercentage
						: secondEntry.profitable === true
							? Number.MAX_SAFE_INTEGER
							: secondEntry.profitable === false
								? -Number.MAX_SAFE_INTEGER
								: null;

				if (firstProfit == null && secondProfit == null) return 0;
				if (firstProfit == null) return 1;
				if (secondProfit == null) return -1;

				const profitComp = firstProfit - secondProfit;
				return this.sortDirection === 'asc' ? profitComp : -profitComp;
			}

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

	private refreshDisplayedHistory(): void {
		let displayedHistory = this.showDistinctItems ? this.getDistinctHistory() : [...this.allHistory];
		if (this.sortColumn) displayedHistory = this.sortEntries(displayedHistory, this.sortColumn);
		this.history = displayedHistory;
	}

	private getDistinctHistory(): SearchHistoryEntry[] {
		const latestEntryByItem = new Map<string, SearchHistoryEntry>();

		for (const entry of this.allHistory) {
			const itemKey = entry.name.trim().toLocaleLowerCase('fr-FR');
			const latestEntry = latestEntryByItem.get(itemKey);
			if (!latestEntry || this.getEntryTimestamp(entry) > this.getEntryTimestamp(latestEntry)) {
				latestEntryByItem.set(itemKey, entry);
			}
		}

		return [...latestEntryByItem.values()].sort(
			(firstEntry, secondEntry) => this.getEntryTimestamp(secondEntry) - this.getEntryTimestamp(firstEntry),
		);
	}

	private getEntryTimestamp(entry: SearchHistoryEntry): number {
		const timestamp = new Date(entry.updatedAt).getTime();
		return Number.isFinite(timestamp) ? timestamp : Number.NEGATIVE_INFINITY;
	}

	getSortIcon(column: HistorySortColumn): string {
		if (this.sortColumn !== column) return 'pi pi-sort-alt';
		return this.sortDirection === 'asc' ? 'pi pi-sort-amount-up' : 'pi pi-sort-amount-down';
	}

	getAriaSort(column: HistorySortColumn): 'ascending' | 'descending' | 'none' {
		if (this.sortColumn !== column) return 'none';
		return this.sortDirection === 'asc' ? 'ascending' : 'descending';
	}

	private escapeCsvValue(value: string | number | null): string {
		if (value === null) return '';
		if (typeof value === 'number') return String(value).replace('.', ',');

		const safeValue = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
		return `"${safeValue.replace(/"/g, '""')}"`;
	}

	private formatCsvDate(date: string): string {
		return new Intl.DateTimeFormat('fr-FR', {
			day: '2-digit',
			month: '2-digit',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
		}).format(new Date(date));
	}
}

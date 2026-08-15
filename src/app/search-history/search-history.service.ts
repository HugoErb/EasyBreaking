import { Injectable } from '@angular/core';

export interface SearchHistoryEntry {
	id: number;
	name: string;
	image: string;
	level: number;
	type: string;
	breakRate: number | null;
	updatedAt: string;
}

type SearchHistoryItem = Pick<SearchHistoryEntry, 'id' | 'name' | 'image' | 'level' | 'type'>;

@Injectable({ providedIn: 'root' })
export class SearchHistoryService {
	private readonly storageKey = 'searchHistory';

	getEntries(): SearchHistoryEntry[] {
		const storedHistory = localStorage.getItem(this.storageKey);
		if (!storedHistory) return [];

		try {
			const entries = JSON.parse(storedHistory);
			return Array.isArray(entries) ? entries : [];
		} catch {
			return [];
		}
	}

	recordSearch(item: SearchHistoryItem): void {
		this.saveEntry(item, undefined);
	}

	recordBreakRate(item: SearchHistoryItem, breakRate: number | null): void {
		this.saveEntry(item, breakRate);
	}

	private saveEntry(item: SearchHistoryItem, breakRate: number | null | undefined): void {
		const entries = this.getEntries();
		const existingEntry = entries.find((entry) => entry.id === item.id);
		const entry: SearchHistoryEntry = {
			id: item.id,
			name: item.name,
			image: item.image,
			level: item.level,
			type: item.type,
			breakRate: breakRate === undefined ? (existingEntry?.breakRate ?? null) : breakRate,
			updatedAt: new Date().toISOString(),
		};

		localStorage.setItem(
			this.storageKey,
			JSON.stringify([entry, ...entries.filter((historyEntry) => historyEntry.id !== item.id)]),
		);
	}
}

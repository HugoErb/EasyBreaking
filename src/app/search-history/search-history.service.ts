import { Injectable } from '@angular/core';

export interface SearchHistoryEntry {
	historyId: string;
	name: string;
	image: string;
	level: number;
	type: string;
	breakRate: number | null;
	craftPrice: number | null;
	profitable: boolean | null;
	kamasEarned: number | null;
	profitPercentage: number | null;
	focus: string | null;
	updatedAt: string;
}

export type SearchHistoryUpdate = Pick<
	SearchHistoryEntry,
	'breakRate' | 'craftPrice' | 'profitable' | 'kamasEarned' | 'profitPercentage' | 'focus'
>;

type SearchHistoryItem = Pick<SearchHistoryEntry, 'name' | 'image' | 'type'> & { level: number | string };

const HISTORY_UPDATE_WINDOW_MS = 5 * 60 * 1000;

@Injectable({ providedIn: 'root' })
export class SearchHistoryService {
	private readonly storageKey = 'searchHistory';
	private prefilledEntry: SearchHistoryEntry | null = null;

	setPrefilledEntry(entry: SearchHistoryEntry): void {
		this.prefilledEntry = entry;
	}

	consumePrefilledEntry(): SearchHistoryEntry | null {
		const entry = this.prefilledEntry;
		this.prefilledEntry = null;
		return entry;
	}

	getPrefilledEntry(): SearchHistoryEntry | null {
		return this.prefilledEntry;
	}

	getEntries(): SearchHistoryEntry[] {
		const storedHistory = localStorage.getItem(this.storageKey);
		if (!storedHistory) return [];

		try {
			const entries: unknown = JSON.parse(storedHistory);
			if (!Array.isArray(entries)) return [];

			return entries
				.map((entry, index) => this.normalizeEntry(entry, index))
				.filter((entry): entry is SearchHistoryEntry => entry !== null);
		} catch {
			return [];
		}
	}

	recordSearch(item: SearchHistoryItem): string {
		const historyId = crypto.randomUUID();
		const entry: SearchHistoryEntry = {
			historyId,
			name: item.name,
			image: item.image,
			level: Number(item.level),
			type: item.type,
			breakRate: null,
			craftPrice: null,
			profitable: null,
			kamasEarned: null,
			profitPercentage: null,
			focus: null,
			updatedAt: new Date().toISOString(),
		};

		this.saveEntries([entry, ...this.getEntries()]);
		return historyId;
	}

	updateEntry(historyId: string, update: SearchHistoryUpdate): string {
		const entries = this.getEntries();
		const entryIndex = entries.findIndex((entry) => entry.historyId === historyId);
		if (entryIndex === -1) return historyId;

		const now = Date.now();
		const previousUpdateTime = new Date(entries[entryIndex].updatedAt).getTime();
		const entryAge = now - previousUpdateTime;
		const canUpdateExistingEntry = Number.isFinite(previousUpdateTime) && entryAge >= 0 && entryAge < HISTORY_UPDATE_WINDOW_MS;
		const updatedAt = new Date(now).toISOString();

		if (!canUpdateExistingEntry) {
			const newHistoryId = crypto.randomUUID();
			const newEntry: SearchHistoryEntry = {
				...entries[entryIndex],
				...update,
				historyId: newHistoryId,
				updatedAt,
			};

			this.saveEntries([newEntry, ...entries]);
			return newHistoryId;
		}

		entries[entryIndex] = {
			...entries[entryIndex],
			...update,
			updatedAt,
		};
		this.saveEntries(entries);
		return historyId;
	}

	deleteEntry(historyId: string): void {
		this.saveEntries(this.getEntries().filter((entry) => entry.historyId !== historyId));
	}

	private saveEntries(entries: SearchHistoryEntry[]): void {
		localStorage.setItem(this.storageKey, JSON.stringify(entries));
	}

	private normalizeEntry(value: unknown, index: number): SearchHistoryEntry | null {
		if (typeof value !== 'object' || value === null) return null;

		const entry = value as Record<string, unknown>;
		const level = Number(entry['level']);
		if (
			typeof entry['name'] !== 'string' ||
			typeof entry['image'] !== 'string' ||
			!Number.isFinite(level) ||
			typeof entry['type'] !== 'string'
		) {
			return null;
		}

		return {
			historyId: typeof entry['historyId'] === 'string' ? entry['historyId'] : `legacy-${entry['name']}-${index}`,
			name: entry['name'],
			image: entry['image'],
			level,
			type: entry['type'],
			breakRate: typeof entry['breakRate'] === 'number' ? entry['breakRate'] : null,
			craftPrice: typeof entry['craftPrice'] === 'number' ? entry['craftPrice'] : null,
			profitable: typeof entry['profitable'] === 'boolean' ? entry['profitable'] : null,
			kamasEarned: typeof entry['kamasEarned'] === 'number' ? entry['kamasEarned'] : null,
			profitPercentage: typeof entry['profitPercentage'] === 'number' ? entry['profitPercentage'] : null,
			focus: typeof entry['focus'] === 'string' ? entry['focus'] : null,
			updatedAt: typeof entry['updatedAt'] === 'string' ? entry['updatedAt'] : new Date().toISOString(),
		};
	}
}

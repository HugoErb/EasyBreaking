import { SearchHistoryService } from './search-history.service';

describe('SearchHistoryService', () => {
	const item = {
		id: 42,
		name: 'Item de test',
		image: 'item.png',
		level: 100,
		type: 'Amulette',
	};
	let service: SearchHistoryService;

	beforeEach(() => {
		localStorage.removeItem('searchHistory');
		service = new SearchHistoryService();
	});

	afterEach(() => localStorage.removeItem('searchHistory'));

	it('keeps every search, including repeated searches for the same item', () => {
		service.recordSearch(item);
		service.recordSearch(item);

		expect(service.getEntries().length).toBe(2);
		expect(service.getEntries()[0].historyId).not.toBe(service.getEntries()[1].historyId);
	});

	it('updates only the active history entry with all calculation details', () => {
		const firstHistoryId = service.recordSearch(item);
		const secondHistoryId = service.recordSearch(item);

		service.updateEntry(secondHistoryId, {
			breakRate: 125,
			craftPrice: 50_000,
			profitable: true,
			focus: 'Rune Fo',
		});

		const entries = service.getEntries();
		expect(entries.find((entry) => entry.historyId === secondHistoryId)).toEqual(
			jasmine.objectContaining({ breakRate: 125, craftPrice: 50_000, profitable: true, focus: 'Rune Fo' }),
		);
		expect(entries.find((entry) => entry.historyId === firstHistoryId)?.breakRate).toBeNull();
	});

	it('retains entries written by the previous history format', () => {
		localStorage.setItem(
			'searchHistory',
			JSON.stringify([{ ...item, id: undefined, level: '100', breakRate: 110, updatedAt: '2026-08-15T10:00:00.000Z' }]),
		);

		expect(service.getEntries()[0]).toEqual(
			jasmine.objectContaining({ name: item.name, level: 100, breakRate: 110, craftPrice: null }),
		);
	});

	it('deletes only the selected history entry', () => {
		const firstHistoryId = service.recordSearch(item);
		const secondHistoryId = service.recordSearch(item);

		service.deleteEntry(secondHistoryId);

		expect(service.getEntries().map((entry) => entry.historyId)).toEqual([firstHistoryId]);
	});
});

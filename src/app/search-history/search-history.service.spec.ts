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
			kamasEarned: 75_000,
			profitPercentage: 50,
			focus: 'Rune Fo',
		});

		const entries = service.getEntries();
		expect(entries.find((entry) => entry.historyId === secondHistoryId)).toEqual(
			jasmine.objectContaining({
				breakRate: 125,
				craftPrice: 50_000,
				profitable: true,
				kamasEarned: 75_000,
				profitPercentage: 50,
				focus: 'Rune Fo',
			}),
		);
		expect(entries.find((entry) => entry.historyId === firstHistoryId)?.breakRate).toBeNull();
		expect(entries.find((entry) => entry.historyId === firstHistoryId)?.kamasEarned).toBeNull();
		expect(entries.find((entry) => entry.historyId === firstHistoryId)?.profitPercentage).toBeNull();
	});

	it('retains entries written by the previous history format', () => {
		localStorage.setItem(
			'searchHistory',
			JSON.stringify([{ ...item, id: undefined, level: '100', breakRate: 110, updatedAt: '2026-08-15T10:00:00.000Z' }]),
		);

		expect(service.getEntries()[0]).toEqual(
			jasmine.objectContaining({
				name: item.name,
				level: 100,
				breakRate: 110,
				craftPrice: null,
				kamasEarned: null,
				profitPercentage: null,
			}),
		);
	});

	it('deletes only the selected history entry', () => {
		const firstHistoryId = service.recordSearch(item);
		const secondHistoryId = service.recordSearch(item);

		service.deleteEntry(secondHistoryId);

		expect(service.getEntries().map((entry) => entry.historyId)).toEqual([firstHistoryId]);
	});

	it('stores and consumes prefilled entry correctly', () => {
		const entry = service.getEntries()[0];
		const dummyEntry = {
			historyId: 'test-id',
			name: 'Test Item',
			image: 'test.png',
			level: 150,
			type: 'Bague',
			breakRate: 120,
			craftPrice: 80_000,
			profitable: true,
			kamasEarned: 110_000,
			profitPercentage: 37.5,
			focus: 'Sans focus',
			updatedAt: '2026-08-19T10:00:00.000Z',
		};

		service.setPrefilledEntry(dummyEntry);
		expect(service.getPrefilledEntry()).toEqual(dummyEntry);

		const consumed = service.consumePrefilledEntry();
		expect(consumed).toEqual(dummyEntry);
		expect(service.getPrefilledEntry()).toBeNull();
		expect(service.consumePrefilledEntry()).toBeNull();
	});
});

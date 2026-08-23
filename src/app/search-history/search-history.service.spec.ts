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
		jasmine.clock().install();
		jasmine.clock().mockDate(new Date('2026-08-23T10:00:00.000Z'));
		localStorage.removeItem('searchHistory');
		service = new SearchHistoryService();
	});

	afterEach(() => {
		jasmine.clock().uninstall();
		localStorage.removeItem('searchHistory');
	});

	it('reuses the latest line when the same item is selected within five minutes', () => {
		const firstHistoryId = service.recordSearch(item);
		const secondHistoryId = service.recordSearch(item);

		expect(secondHistoryId).toBe(firstHistoryId);
		expect(service.getEntries().length).toBe(1);
	});

	it('creates a new line when the same item is selected after five minutes', () => {
		const firstHistoryId = service.recordSearch(item);
		jasmine.clock().mockDate(new Date('2026-08-23T10:05:00.000Z'));
		const secondHistoryId = service.recordSearch(item);

		expect(secondHistoryId).not.toBe(firstHistoryId);
		expect(service.getEntries().length).toBe(2);
	});

	it('updates only the active history entry with all calculation details', () => {
		const firstHistoryId = service.recordSearch(item);
		jasmine.clock().mockDate(new Date('2026-08-23T10:05:00.000Z'));
		const secondHistoryId = service.recordSearch(item);

		const updatedHistoryId = service.updateEntry(secondHistoryId, {
			breakRate: 125,
			craftPrice: 50_000,
			profitable: true,
			kamasEarned: 75_000,
			profitPercentage: 50,
			focus: 'Rune Fo',
		});

		const entries = service.getEntries();
		expect(updatedHistoryId).toBe(secondHistoryId);
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

	it('creates a new complete entry when the active entry reaches five minutes old', () => {
		const firstHistoryId = service.recordSearch(item);
		jasmine.clock().mockDate(new Date('2026-08-23T10:05:00.000Z'));

		const secondHistoryId = service.updateEntry(firstHistoryId, {
			breakRate: 140,
			craftPrice: 100_000,
			profitable: true,
			kamasEarned: 125_000,
			profitPercentage: 25,
			focus: 'Rune Fo',
		});

		const entries = service.getEntries();
		expect(secondHistoryId).not.toBe(firstHistoryId);
		expect(entries.length).toBe(2);
		expect(entries[0]).toEqual(
			jasmine.objectContaining({
				historyId: secondHistoryId,
				name: item.name,
				breakRate: 140,
				craftPrice: 100_000,
				profitPercentage: 25,
				updatedAt: '2026-08-23T10:05:00.000Z',
			}),
		);
		expect(entries.find((entry) => entry.historyId === firstHistoryId)?.breakRate).toBeNull();
	});

	it('keeps updating the newly created entry inside its new five-minute window', () => {
		const firstHistoryId = service.recordSearch(item);
		jasmine.clock().mockDate(new Date('2026-08-23T10:05:00.000Z'));
		const secondHistoryId = service.updateEntry(firstHistoryId, {
			breakRate: 140,
			craftPrice: null,
			profitable: null,
			kamasEarned: 125_000,
			profitPercentage: null,
			focus: 'Rune Fo',
		});

		jasmine.clock().mockDate(new Date('2026-08-23T10:09:59.999Z'));
		const updatedHistoryId = service.updateEntry(secondHistoryId, {
			breakRate: 150,
			craftPrice: null,
			profitable: null,
			kamasEarned: 135_000,
			profitPercentage: null,
			focus: 'Rune Fo',
		});

		expect(updatedHistoryId).toBe(secondHistoryId);
		expect(service.getEntries().length).toBe(2);
		expect(service.getEntries()[0].breakRate).toBe(150);
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
		jasmine.clock().mockDate(new Date('2026-08-23T10:05:00.000Z'));
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

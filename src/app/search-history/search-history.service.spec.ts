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

	it('records a selected item without a break rate', () => {
		service.recordSearch(item);

		expect(service.getEntries()[0]).toEqual(
			jasmine.objectContaining({ id: item.id, name: item.name, breakRate: null }),
		);
	});

	it('updates the break rate without creating a duplicate', () => {
		service.recordSearch(item);
		service.recordBreakRate(item, 125);

		expect(service.getEntries().length).toBe(1);
		expect(service.getEntries()[0].breakRate).toBe(125);
	});

	it('keeps the recorded break rate when the item is selected again', () => {
		service.recordBreakRate(item, 125);
		service.recordSearch(item);

		expect(service.getEntries()[0].breakRate).toBe(125);
	});
});

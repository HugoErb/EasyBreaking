import {
	APP_SETTINGS_STORAGE_KEY,
	DEFAULT_APP_SETTINGS,
	readAppSettings,
	resetAppSettings,
	writeAppSettings,
} from './app-settings';

describe('App settings', () => {
	afterEach(() => localStorage.removeItem(APP_SETTINGS_STORAGE_KEY));

	it('returns defaults when no settings are stored', () => {
		expect(readAppSettings()).toEqual(DEFAULT_APP_SETTINGS);
	});

	it('stores and restores every setting', () => {
		const settings = {
			simplifiedCalculatorTable: true,
			simplifiedDataView: true,
			defaultProfitabilityRate: 40,
			applySaleTaxByDefault: false,
			distinctHistoryByDefault: true,
			saveHistoryOnlyWithCompleteData: true,
			bestItemsDefaultFilters: {
				breakRate: 250,
				minimumLevel: 100,
				maximumLevel: 180,
				selectedTypes: ['Anneau', 'Cape'],
			},
		};

		writeAppSettings(settings);

		expect(readAppSettings()).toEqual(settings);
	});

	it('resets only the settings storage entry', () => {
		localStorage.setItem(APP_SETTINGS_STORAGE_KEY, '{}');
		localStorage.setItem('runesData', '[]');

		expect(resetAppSettings()).toEqual(DEFAULT_APP_SETTINGS);
		expect(localStorage.getItem(APP_SETTINGS_STORAGE_KEY)).toBeNull();
		expect(localStorage.getItem('runesData')).toBe('[]');
		localStorage.removeItem('runesData');
	});
});

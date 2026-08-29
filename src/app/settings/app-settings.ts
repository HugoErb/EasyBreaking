export const APP_SETTINGS_STORAGE_KEY = 'appSettings';

export interface BestItemsDefaultFilters {
	breakRate: number;
	minimumLevel: number;
	maximumLevel: number;
	selectedTypes: string[];
}

export interface AppSettings {
	simplifiedCalculatorTable: boolean;
	simplifiedDataView: boolean;
	defaultProfitabilityRate: number;
	applySaleTaxByDefault: boolean;
	distinctHistoryByDefault: boolean;
	saveHistoryOnlyWithCompleteData: boolean;
	bestItemsDefaultFilters: BestItemsDefaultFilters;
}

export const DEFAULT_APP_SETTINGS: Readonly<AppSettings> = {
	simplifiedCalculatorTable: false,
	simplifiedDataView: false,
	defaultProfitabilityRate: 25,
	applySaleTaxByDefault: true,
	distinctHistoryByDefault: false,
	saveHistoryOnlyWithCompleteData: false,
	bestItemsDefaultFilters: {
		breakRate: 100,
		minimumLevel: 1,
		maximumLevel: 200,
		selectedTypes: [],
	},
};

export function readAppSettings(): AppSettings {
	const defaults = createDefaultAppSettings();

	try {
		const rawSettings = localStorage.getItem(APP_SETTINGS_STORAGE_KEY);
		if (!rawSettings) return defaults;

		const stored = JSON.parse(rawSettings) as Partial<AppSettings>;
		const storedFilters = stored.bestItemsDefaultFilters;
		const minimumLevel = clampNumber(storedFilters?.minimumLevel, 1, 200, defaults.bestItemsDefaultFilters.minimumLevel);
		const maximumLevel = Math.max(
			minimumLevel,
			clampNumber(storedFilters?.maximumLevel, 1, 200, defaults.bestItemsDefaultFilters.maximumLevel),
		);

		return {
			simplifiedCalculatorTable:
				typeof stored.simplifiedCalculatorTable === 'boolean'
					? stored.simplifiedCalculatorTable
					: defaults.simplifiedCalculatorTable,
			simplifiedDataView:
				typeof stored.simplifiedDataView === 'boolean' ? stored.simplifiedDataView : defaults.simplifiedDataView,
			defaultProfitabilityRate: clampNumber(
				stored.defaultProfitabilityRate,
				0,
				9999,
				defaults.defaultProfitabilityRate,
			),
			applySaleTaxByDefault:
				typeof stored.applySaleTaxByDefault === 'boolean'
					? stored.applySaleTaxByDefault
					: defaults.applySaleTaxByDefault,
			distinctHistoryByDefault:
				typeof stored.distinctHistoryByDefault === 'boolean'
					? stored.distinctHistoryByDefault
					: defaults.distinctHistoryByDefault,
			saveHistoryOnlyWithCompleteData:
				typeof stored.saveHistoryOnlyWithCompleteData === 'boolean'
					? stored.saveHistoryOnlyWithCompleteData
					: defaults.saveHistoryOnlyWithCompleteData,
			bestItemsDefaultFilters: {
				breakRate: clampNumber(storedFilters?.breakRate, 0, 4000, defaults.bestItemsDefaultFilters.breakRate),
				minimumLevel,
				maximumLevel,
				selectedTypes: Array.isArray(storedFilters?.selectedTypes)
					? storedFilters.selectedTypes.filter((type): type is string => typeof type === 'string')
					: [],
			},
		};
	} catch {
		return defaults;
	}
}

export function writeAppSettings(settings: AppSettings): void {
	localStorage.setItem(APP_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
}

export function resetAppSettings(): AppSettings {
	localStorage.removeItem(APP_SETTINGS_STORAGE_KEY);
	return createDefaultAppSettings();
}

function createDefaultAppSettings(): AppSettings {
	return {
		...DEFAULT_APP_SETTINGS,
		bestItemsDefaultFilters: {
			...DEFAULT_APP_SETTINGS.bestItemsDefaultFilters,
			selectedTypes: [],
		},
	};
}

function clampNumber(value: unknown, minimum: number, maximum: number, fallback: number): number {
	return typeof value === 'number' && Number.isFinite(value) ? Math.min(Math.max(value, minimum), maximum) : fallback;
}

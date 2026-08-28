import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, ViewChild } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { forkJoin, map, of, tap } from 'rxjs';
import { AutoComplete } from 'primeng/autocomplete';
import { estimateItemsToReachRate } from './break-rate-estimator';
import { SearchHistoryService } from '../search-history/search-history.service';
import { getRuneImagePath as buildRuneImagePath, isUnfocusableRuneStat, parseRunesData, readStoredRunes, RuneData, storeRunes } from '../rune-data';
import { calculateBreaking } from '../breaking-calculator';
import { readAppSettings } from '../settings/app-settings';

interface CachedRune {
	effect: string;
	rune: RuneData;
	runeNumerator: number;
	runeRealWeight: number;
}

type ProfitabilityFocusState = 'neutral' | 'profitable' | 'target' | 'unprofitable';

/**
 * Composant principal de l'application Easy Breaking.
 * Gère la sélection d'un item, l'affichage de ses effets,
 * le calcul des quantités de runes et de la rentabilité.
 */
@Component({
	selector: 'app-home',
	templateUrl: './home.component.html',
	styleUrls: ['./home.component.scss'],
	changeDetection: ChangeDetectionStrategy.OnPush,
	standalone: false,
})
export class HomeComponent implements OnInit {
	// Données de base
	items: any[] = [];
	runes: Array<RuneData & { normalizedStat?: string }> = [];
	selectedItem: any = null;
	filteredItems: any[] = [];

	// Résultats à l'écran
	tableauEffects: any[] = [];
	recipe: any[] = [];

	// Paramètres utilisateur
	tauxBrisage: number | null = 100;
	prixCraft?: number | null = null;
	tauxRentabiliteVise: number = 25;

	// Résultats de calculs
	tauxRentabilitePourcent: number = 0;
	tauxRentabiliteKamas: number = 0;
	norProfitableBreakRate: number | null = 0;

	tauxRentabilitePourcentPaRa: number = 0;
	tauxRentabiliteKamasPaRa: number = 0;
	norProfitableBreakRatePaRa: number | null = 0;

	estimatedItemsBeforeNotProfitable: number = 0;
	estimatedItemsBeforeNotProfitablePaRa: number = 0;

	sumKamasEarned: number = 0;
	sumBestChoicesKamasEarned: number = 0;
	maxFocusedKamasEarned?: number;
	maxValue?: number;
	maxCellColor: string = 'darkgreen';
	maxCellTextColor: string = 'rgb(198, 193, 185)';
	profitabilityFocusState: ProfitabilityFocusState = 'neutral';
	mergeRune: string = 'Aucune';
	maxValuePaRa?: number = 0;

	nombreObjets: number = 1;
	simplifiedCalculatorTable = false;
	simplifiedDataView = false;
	saveHistoryOnlyWithCompleteData = false;
	@ViewChild('autoComplete') autoComplete!: AutoComplete;

	private currentHistoryId: string | null = null;
	private bestNonFocusedMerges: string[] = [];
	private _cachedRunes: CachedRune[] = [];

	constructor(
		private readonly http: HttpClient,
		private readonly cdr: ChangeDetectorRef,
		private readonly searchHistoryService: SearchHistoryService,
		private readonly route?: ActivatedRoute,
	) {}

	/**
	 * Initialisation du composant :
	 * - Chargement des runes (localStorage ou JSON)
	 * - Chargement des items (armes + équipements)
	 * - Mise en place du debounce des inputs
	 */
	ngOnInit(): void {
		const settings = readAppSettings();
		this.simplifiedCalculatorTable = settings.simplifiedCalculatorTable;
		this.simplifiedDataView = settings.simplifiedDataView;
		this.tauxRentabiliteVise = settings.defaultProfitabilityRate;
		this.saveHistoryOnlyWithCompleteData = settings.saveHistoryOnlyWithCompleteData;

		const storedRunes = readStoredRunes();
		const runes$ = storedRunes
			? of(storedRunes)
			: this.http.get<unknown>('assets/jsons/runes.json').pipe(
					map((data) => {
						const runes = parseRunesData(data);
						if (!runes) throw new Error('Le fichier de runes par défaut est invalide.');
						return runes;
					}),
					tap((data) => storeRunes(data)),
				);

		const armes$ = this.http.get<any[]>('assets/jsons/armes.json');
		const equipements$ = this.http.get<any[]>('assets/jsons/equipements.json');

		// forkJoin pour charger les runes et les deux listes en parallèle
		forkJoin([runes$, armes$, equipements$]).subscribe(([runesData, armesData, equipementsData]) => {
			this.runes = runesData.map((rune) => ({ ...rune, normalizedStat: this.normalizeStat(rune.stat) }));
			this.items = [...this.processData(armesData), ...this.processData(equipementsData)]
				.sort((a, b) => a.name.localeCompare(b.name))
				.map((item) => ({ ...item, nameLower: item.name.toLowerCase() }));

			this.checkAndApplyPrefilledEntry();
			this.cdr.markForCheck(); // Permet à Angular de revérifier le composant pour màj le DOM avec vos nouvelles valeurs.
		});
	}

	/**
	 * Transforme les données brutes JSON en objets simplifiés pour l'affichage.
	 * @param data Liste brute d'items
	 * @returns Liste d'items formatés
	 */
	private processData(data: any[]): any[] {
		return data.map((item) => ({
			id: item.id,
			level: item.level,
			name: item.name,
			effects: item.effects,
			recipe: item.recipe,
			type: item.type,
			set: item.set,
			link: item.link,
			image: item.image,
		}));
	}

	/**
	 * Filtre les items pour l'autocomplete.
	 * @param event L'événement du composant PrimeNG contenant la query
	 */
	filterItem(event: any): void {
		const q = event.query.toLowerCase();
		this.filteredItems = q.length === 0 ? this.items : this.items.filter((i) => i.nameLower.includes(q));
	}

	/**
	 * Appelé lors de la sélection d'un item via l'autocomplete.
	 * - Affiche la div
	 * - Met en cache les runes pour chaque effet
	 * - Construit le tableau initial
	 * - Reset des stats de rentabilité
	 */
	onItemSelect(): void {
		if (!this.selectedItem) return;
		this.currentHistoryId = null;
		this.cdr.detectChanges();
		setTimeout(() => this.autoComplete.inputEL?.nativeElement.blur(), 100);
		this.unVanishDiv();
		this.tauxBrisage = 100;
		this.initCachedRunes();
		this.resetStats();
		this.buildTableAndTotals();
		this.updateCurrentHistory();
		this.cdr.markForCheck();
	}

	private initCachedRunes(): void {}

	private checkAndApplyPrefilledEntry(): void {
		const requestedHistoryId = this.route?.snapshot.queryParamMap.get('historyId');
		const historyEntry = requestedHistoryId
			? this.searchHistoryService.getEntries().find((entry) => entry.historyId === requestedHistoryId) ?? null
			: null;
		if (historyEntry) {
			this.applyPrefilledItem(historyEntry.name, historyEntry.breakRate, historyEntry.craftPrice, historyEntry.historyId);
			return;
		}

		const requestedItemName = this.route?.snapshot.queryParamMap.get('item');
		if (requestedItemName) {
			const requestedBreakRateParam = this.route?.snapshot.queryParamMap.get('breakRate');
			const requestedBreakRate = requestedBreakRateParam === null ? Number.NaN : Number(requestedBreakRateParam);
			this.applyPrefilledItem(
				requestedItemName,
				Number.isFinite(requestedBreakRate) ? Math.min(Math.max(requestedBreakRate, 0), 4000) : 100,
				null,
			);
			return;
		}

		const entry = this.searchHistoryService.consumePrefilledEntry();
		if (entry) this.applyPrefilledItem(entry.name, entry.breakRate, entry.craftPrice, entry.historyId);
	}

	private applyPrefilledItem(itemName: string, breakRate: number | null, craftPrice: number | null, historyId?: string): void {
		const targetItem = this.items.find((item) => item.name.localeCompare(itemName, 'fr', { sensitivity: 'base' }) === 0);
		if (!targetItem) return;

		this.selectedItem = targetItem;
		this.currentHistoryId = historyId ?? null;
		this.tauxBrisage = breakRate ?? 100;
		this.prixCraft = craftPrice;
		this.ensureCurrentHistoryEntry();

		this.initCachedRunes();
		this.buildTableAndTotals();
		this.computeRentabilities();
		this.defineCellColor();
		this.cdr.detectChanges();
		this.unVanishDiv();
		this.cdr.markForCheck();
	}

	/**
	 * Recalcule :
	 * - Le tableau d'effets + totaux
	 * - Les indicateurs de rentabilité
	 * - La couleur des cellules
	 */
	onInputChange(): void {
		if (!this.selectedItem) return;
		this.buildTableAndTotals();
		this.computeRentabilities();
		this.defineCellColor();
		this.updateCurrentHistory();
		this.cdr.markForCheck(); // Permet à Angular de revérifier le composant pour màj le DOM avec vos nouvelles valeurs.
	}

	/**
	 * Appelé seulement quand on change le prix de craft ou le taux de rentabilité visé.
	 * Ne recalcule que la partie rentabilité, pas tout le tableau.
	 */
	onEconomicsInputChange(): void {
		if (!this.selectedItem) return;
		this.computeRentabilities();
		this.defineCellColor();
		this.updateCurrentHistory();
		this.cdr.markForCheck(); // Permet à Angular de revérifier le composant pour màj le DOM avec vos nouvelles valeurs.
	}

	private updateCurrentHistory(): void {
		if (this.saveHistoryOnlyWithCompleteData && !this.hasCompleteHistoryData()) return;
		this.ensureCurrentHistoryEntry();
		if (!this.currentHistoryId) return;

		const bestFocusedRow = this.tableauEffects.find((row) => row.focusedKamasEarned === this.maxFocusedKamasEarned);
		let bestValue = this.sumKamasEarned;
		let focus = 'Sans focus';

		if (this.maxFocusedKamasEarned != null && this.maxFocusedKamasEarned > bestValue) {
			bestValue = this.maxFocusedKamasEarned;
			focus = bestFocusedRow?.runeName ?? 'Non déterminé';
		}

		if (this.mergeRune !== 'Aucune' && this.maxValuePaRa != null && this.maxValuePaRa > bestValue) {
			bestValue = this.maxValuePaRa;
			focus = this.mergeRune;
		}

		const hasValidKamas = this.tauxBrisage != null && Number.isFinite(bestValue);
		const kamasEarned = hasValidKamas ? bestValue : null;

		let profitPercentage: number | null = null;
		let profitable: boolean | null = null;

		if (this.prixCraft != null && this.prixCraft > 0 && hasValidKamas) {
			profitPercentage = Number.parseFloat((((bestValue - this.prixCraft) / this.prixCraft) * 100).toFixed(2));
			profitable = bestValue > this.prixCraft;
		}

		this.currentHistoryId = this.searchHistoryService.updateEntry(this.currentHistoryId, {
			breakRate: this.tauxBrisage,
			craftPrice: this.prixCraft ?? null,
			profitable,
			kamasEarned,
			profitPercentage,
			focus,
		});
	}

	private ensureCurrentHistoryEntry(): void {
		if (this.currentHistoryId || !this.selectedItem) return;
		if (this.saveHistoryOnlyWithCompleteData && !this.hasCompleteHistoryData()) return;
		this.currentHistoryId = this.searchHistoryService.recordSearch(this.selectedItem);
	}

	private hasCompleteHistoryData(): boolean {
		return this.tauxBrisage != null && this.prixCraft != null && this.prixCraft > 0;
	}

	/**
	 * Construit le tableau des effets (chaque ligne contient quantités et gains)
	 * et calcule sumKamasEarned, maxFocusedKamasEarned et maxValue.
	 */
	private buildTableAndTotals(): void {
		if (this.tauxBrisage != null) {
			this.tauxBrisage = Math.min(Math.max(this.tauxBrisage, 0), 4000);
		}
		const calculation = calculateBreaking(this.selectedItem, this.runes, this.tauxBrisage ?? 0);
		this.tableauEffects = calculation.rows;
		this.recipe = this.selectedItem.recipe;
		this.sumKamasEarned = calculation.standardKamas;
		this.sumBestChoicesKamasEarned = calculation.bestNonFocusedKamas;
		this.maxFocusedKamasEarned = calculation.bestFocusedKamas;
		this.maxValue = calculation.bestWithoutFusionKamas;
		this.bestNonFocusedMerges = calculation.nonFocusedMerges;
		this.mergeRune = calculation.mergeName;
		this.maxValuePaRa = calculation.fusionKamas;
	}

	private updateBestNonFocusedChoices(): void {
		this.sumBestChoicesKamasEarned = 0;
		this.bestNonFocusedMerges = [];

		for (const row of this.tableauEffects) {
			const bestBaseValue = Math.max(row.kamasEarned, row.basePaKamasEarned, row.baseRaKamasEarned);
			this.sumBestChoicesKamasEarned += bestBaseValue;
			if (row.basePaKamasEarned > row.kamasEarned && row.basePaKamasEarned >= row.baseRaKamasEarned) {
				this.bestNonFocusedMerges.push(`Pa ${row.runeName}`);
			} else if (row.baseRaKamasEarned > row.kamasEarned) {
				this.bestNonFocusedMerges.push(`Ra ${row.runeName}`);
			}
		}
	}

	/**
	 * Détermine si la fusion PA ou RA est la plus rentable
	 * et met à jour mergeRune et maxValuePaRa en conséquence.
	 */
	private determineBestMergeRune(): void {
		if (this.tauxBrisage == null) {
			this.mergeRune = 'Aucune';
			this.maxValuePaRa = 0;
			return;
		}

		const nonFocusedMergeLabel =
			this.bestNonFocusedMerges.length > 1 ? 'Plusieurs (voir tableau)' : this.bestNonFocusedMerges[0];
		let bestMerge: { name: string; value: number } | null =
			nonFocusedMergeLabel && this.sumBestChoicesKamasEarned > (this.maxValue ?? 0)
				? { name: nonFocusedMergeLabel, value: this.sumBestChoicesKamasEarned }
				: null;
		for (const row of this.tableauEffects) {
			const candidates = [
				{ name: `Pa ${row.runeName}`, value: row.paKamasEarned },
				{ name: `Ra ${row.runeName}`, value: row.raKamasEarned },
			];

			for (const candidate of candidates) {
				if (candidate.value <= row.focusedKamasEarned || candidate.value <= (this.maxValue ?? 0)) continue;
				if (!bestMerge || candidate.value > bestMerge.value) bestMerge = candidate;
			}
		}

		this.mergeRune = bestMerge?.name ?? 'Aucune';
		this.maxValuePaRa = bestMerge?.value ?? 0;
	}

	/**
	 * Met à jour tous les indicateurs de rentabilité
	 */
	private computeRentabilities(): void {
		if (this.prixCraft == null) {
			this.resetStats();
			return;
		}

		const computeStats = (totalKamas: number, includePaRa: boolean): [number, number, number | null] => {
			const profit = Math.round(totalKamas - this.prixCraft!);
			const percent = Number.parseFloat(((profit / this.prixCraft!) * 100).toFixed(2));
			const breakRate = this.findNorProfitableBreakRate(includePaRa);
			return [profit, percent, breakRate];
		};

		// Sans fusion
		[this.tauxRentabiliteKamas, this.tauxRentabilitePourcent, this.norProfitableBreakRate] = computeStats(this.maxValue!, false);
		this.estimatedItemsBeforeNotProfitable =
			this.norProfitableBreakRate === null
				? 0
				: estimateItemsToReachRate(this.tauxBrisage!, this.norProfitableBreakRate, this.selectedItem.level);

		// Avec fusion Pa/RA si applicable
		if (this.mergeRune === 'Aucune') {
			this.tauxRentabiliteKamasPaRa = 0;
			this.tauxRentabilitePourcentPaRa = 0;
			this.norProfitableBreakRatePaRa = 0;
			this.estimatedItemsBeforeNotProfitablePaRa = 0;
		} else {
			[this.tauxRentabiliteKamasPaRa, this.tauxRentabilitePourcentPaRa, this.norProfitableBreakRatePaRa] = computeStats(
				this.maxValuePaRa!,
				true,
			);
			this.estimatedItemsBeforeNotProfitablePaRa =
				this.norProfitableBreakRatePaRa === null
					? 0
					: estimateItemsToReachRate(this.tauxBrisage!, this.norProfitableBreakRatePaRa, this.selectedItem.level);
		}

		this.updateRecipeItemCountFromEstimate();
	}

	private updateRecipeItemCountFromEstimate(): void {
		const estimatedItems =
			this.estimatedItemsBeforeNotProfitablePaRa > 0
				? this.estimatedItemsBeforeNotProfitablePaRa
				: this.estimatedItemsBeforeNotProfitable;

		if (estimatedItems > 0) {
			this.nombreObjets = estimatedItems;
		}
	}

	/**
	 * Remet à zéro les statistiques de la partie "Rentabilité".
	 */
	private resetStats(): void {
		this.tauxRentabilitePourcent = 0;
		this.tauxRentabiliteKamas = 0;
		this.norProfitableBreakRate = 0;
		this.tauxRentabilitePourcentPaRa = 0;
		this.tauxRentabiliteKamasPaRa = 0;
		this.norProfitableBreakRatePaRa = 0;
		this.estimatedItemsBeforeNotProfitable = 0;
		this.estimatedItemsBeforeNotProfitablePaRa = 0;
		this.prixCraft = null;
		this.maxCellColor = 'darkgreen';
		this.maxCellTextColor = 'rgb(198, 193, 185)';
		this.profitabilityFocusState = 'neutral';
		this.nombreObjets = 1;
	}

	/**
	 * Trouve le taux de brisage à partir duquel l'item est (ou n'est plus) rentable.
	 *
	 * @returns Le taux de brisage à partir duquel briser l'item est (ou n'est plus) rentable.
	 */
	findNorProfitableBreakRate(includePaRa: boolean): number | null {
		const MIN_BREAK_RATE = 0;
		const MAX_BREAK_RATE = 4000;

		let low = MIN_BREAK_RATE;
		let high = MAX_BREAK_RATE;

		// Ce sera notre meilleur taux trouvé (rentable), initialisé à une valeur impossible
		let minimalProfitableRate: number | null = null;

		// Recherche binaire classique
		while (low <= high) {
			const midRate = Math.floor((low + high) / 2);
			const profit = this.calculateBenefit(midRate, includePaRa);

			if (profit <= 0) {
				// Pas rentable à ce taux, il faut tester plus haut
				low = midRate + 1;
			} else {
				// Rentable → on mémorise ce taux comme possible, et on cherche plus bas
				minimalProfitableRate = midRate;
				high = midRate - 1;
			}
		}

		return minimalProfitableRate;
	}

	/**
	 * Calcule le bénéfice total en Kamas pour un taux de brisage donné, en considérant
	 * à la fois le bénéfice global et le bénéfice maximal concentré sur un seul effet.
	 *
	 * @param tauxBrisage Le taux de brisage à utiliser pour le calcul, exprimé en pourcentage.
	 * @param includePaRa   Si true, on inclut aussi le calcul pour les runes PA/RA.
	 * @returns Le bénéfice total en Kamas après soustraction du coût de production de l'item,
	 *          ou 0 si le prix de craft n'est pas renseigné.
	 */
	calculateBenefit(tauxBrisage: number, includePaRa: boolean): number {
		if (this.prixCraft == null) return 0;
		const calculation = calculateBreaking(this.selectedItem, this.runes, tauxBrisage);
		const earnedKamas = includePaRa ? calculation.bestKamas : calculation.bestWithoutFusionKamas;
		return Math.round(earnedKamas - this.prixCraft);
	}

	/**
	 * Met à jour le prix d'une rune dans le localStorage et dans le cache.
	 * Déclenche aussi un recalcul du tableau.
	 *
	 * @param runeName - Le nom de la rune à modifier.
	 * @param newPrice - Le nouveau prix saisi.
	 */
	updateRunePrice(runeName: string, newPrice: number): void {
		const rune = this.runes.find((candidate) => candidate.name === runeName);
		if (!rune) return;
		rune.price = newPrice;
		storeRunes(this.runes);
		this.buildTableAndTotals();
		this.computeRentabilities();
		this.defineCellColor();
		this.updateCurrentHistory();
		this.cdr.markForCheck();
	}

	/**
	 * Détermine la couleur de la cellule en fonction des valeurs de prixCraft, tauxRentabiliteVise et maxValue.
	 * Met à jour la valeur de maxCellColor correspondante.
	 */
	defineCellColor(): void {
		if (this.prixCraft == null || this.tauxRentabiliteVise == null || this.maxValue == null) {
			this.profitabilityFocusState = 'neutral';
			return;
		}

		const valeurRentable = this.prixCraft * (1 + Number(this.tauxRentabiliteVise) / 100);
		const bestValue = Math.max(this.maxValue, this.maxValuePaRa ?? 0);

		if (bestValue < this.prixCraft) {
			this.maxCellColor = 'darkred';
			this.maxCellTextColor = 'rgb(198, 193, 185)';
			this.profitabilityFocusState = 'unprofitable';
		} else if (bestValue < valeurRentable) {
			this.maxCellColor = '#e6d600';
			this.maxCellTextColor = '#404d5c';
			this.profitabilityFocusState = 'target';
		} else {
			this.maxCellColor = 'darkgreen';
			this.maxCellTextColor = 'rgb(198, 193, 185)';
			this.profitabilityFocusState = 'profitable';
		}
	}

	isBestFocusedCell(row: any): boolean {
		if ((this.maxValuePaRa ?? 0) > (this.maxValue ?? 0)) {
			if (this.sumBestChoicesKamasEarned === this.maxValuePaRa) return false;
			return row.paKamasEarned === this.maxValuePaRa || row.raKamasEarned === this.maxValuePaRa;
		}

		return row.focusedKamasEarned === this.maxValue && row.focusedKamasEarned !== 0;
	}

	isBestTotalCell(): boolean {
		if ((this.maxValuePaRa ?? 0) > (this.maxValue ?? 0)) {
			return this.sumBestChoicesKamasEarned === this.maxValuePaRa;
		}

		return this.sumKamasEarned === this.maxValue && this.sumKamasEarned !== 0;
	}

	/**
	 * Trouve la rune correspondante à une statistique d'objet donnée.
	 *
	 * @param itemStatistic - La statistique de l'objet pour laquelle on souhaite trouver la rune correspondante.
	 * @returns La rune correspondante trouvée, ou undefined si aucune rune correspondante n'est trouvée.
	 */
	findMatchingRune(itemStatistic: string): any {
		const hasPercent = itemStatistic.includes('%');
		const normalizedItemStat = this.normalizeStat(itemStatistic);

		const filteredRunes = this.runes.filter((rune: any) => {
			const normalizedRuneStat = rune.normalizedStat ?? this.normalizeStat(rune.stat);

			// Cas particulier : différencier résistance fixe et %
			if (normalizedItemStat.includes('résistance')) {
				if (hasPercent && !rune.stat.startsWith('%')) return false;
				if (!hasPercent && rune.stat.startsWith('%')) return false;
			}

			return normalizedItemStat.includes(normalizedRuneStat);
		});

		filteredRunes.sort((a: any, b: any) => this.compareByLength(a.stat, b.stat));

		return filteredRunes[0];
	}

	/**
	 * Normalise une chaîne de caractères représentant une statistique d'objet ou de rune.
	 *
	 * @param stat - La chaîne représentant la statistique à normaliser.
	 * @returns La version normalisée de la statistique.
	 */
	normalizeStat(stat: string): string {
		return stat
			.toLowerCase()
			.replaceAll(/[^a-zàâçéèêëîïôûùüÿñæœ\s]/gi, '') // supprime les % et autres
			.replace(/\bpo\b/, 'portée')
			.replace(/\bpa\b/, 'pa')
			.replace(/\bpm\b/, 'pm')
			.replace(/\b%?\s*critique(s)?\b/, 'critique')
			.replace(/\bdommage(s)? de poussée\b/, 'dommage poussée')
			.replace(/\bdommage(s)? critiques?\b/, 'dommage critiques')
			.replace(/\b%?\s*résistance(s)?\b/, 'résistance')
			.replace(/\b%?\s*dommage(s)?\b/, 'dommage')
			.replaceAll(/\s+/g, ' ')
			.trim();
	}

	/**
	 * Compare deux chaînes de caractères en fonction de leur longueur.
	 *
	 * @param strA - La première chaîne de caractères à comparer.
	 * @param strB - La deuxième chaîne de caractères à comparer.
	 * @returns Un nombre positif si strB est plus longue que strA, un nombre négatif si strA est plus longue que strB, ou 0 si les deux sont de même longueur.
	 */
	compareByLength(strA: string, strB: string): number {
		return strB.length - strA.length;
	}

	/**
	 * Calcule la moyenne des nombres extraits d'une chaîne de caractères.
	 *
	 * @param value - La chaîne de caractères à analyser.
	 * @returns La moyenne des nombres extraits, ou 0 si aucun nombre n'est trouvé.
	 */
	calculateAverage(value: string): number {
		const numbers: number[] = [];
		const regex = /\d+/g;
		let match: RegExpExecArray | null;

		while ((match = regex.exec(value)) !== null) {
			numbers.push(Number(match[0]));
		}

		if (numbers.length === 1) {
			return numbers[0];
		} else if (numbers.length >= 2) {
			const sum = numbers.reduce((a, b) => a + b);
			return sum / numbers.length;
		} else {
			return 0;
		}
	}

	/**
	 * Obtient le poids réel d'une rune.
	 *
	 * @param rune - La rune dont on souhaite obtenir le poids réel.
	 * @returns Le poids réel de la rune.
	 */
	getRealRuneWeight(rune: any): number {
		let runeWeight: number;

		if (rune.stat === 'Vitalité' || rune.stat === 'Initiative') {
			runeWeight = 1;
		} else if (rune.stat === 'Pod') {
			runeWeight = 2.5;
		} else {
			runeWeight = rune.weight;
		}

		return runeWeight;
	}

	/**
	 * Calcule la quantité de runes en fonction du taux, de la rune et de l'effet.
	 *
	 * @param taux - Le taux de réussite du craft des runes.
	 * @param rune - La rune pour laquelle on souhaite calculer la quantité.
	 * @param effect - L'effet utilisé dans le calcul.
	 * @returns La quantité de runes calculée.
	 */
	calculateRuneQuantity(taux: any, cached: CachedRune): number {
		return (cached.runeNumerator * taux) / 100 / cached.runeRealWeight;
	}

	/**
	 * Calcule la quantité de runes pour une statistique spécifique en fonction du taux, de la statistique ciblée et de la liste d'effets.
	 *
	 * @param taux - Le taux de réussite du craft des runes.
	 * @param statFocused - La statistique ciblée pour laquelle on souhaite calculer la quantité de runes.
	 * @param effectsList - La liste des effets utilisés dans le calcul.
	 * @returns La quantité de runes calculée pour la statistique ciblée.
	 */
	calculateRuneQuantityFocused(taux: any, statFocused: any): number {
		const cachedFocused = this._cachedRunes.find((c) => c.effect === statFocused);
		if (!cachedFocused || isUnfocusableRuneStat(cachedFocused.rune.stat)) return 0;

		let runeQuantityFocused = 0;
		for (const cached of this._cachedRunes) {
			let res = cached.runeNumerator;
			if (cached.effect !== statFocused) res /= 2;
			runeQuantityFocused += res;
		}

		return (runeQuantityFocused / cachedFocused.runeRealWeight) * (taux / 100);
	}

	/**
	 * Copie le nom de l'ingrédient dans le presse-papiers et affiche une tooltip.
	 *
	 * @param ingredientName Le nom de l'ingrédient à copier.
	 * @param event L'événement MouseEvent associé au clic.
	 */
	copyToClipboard(event: MouseEvent, ingredientName: string): void {
		navigator.clipboard
			.writeText(ingredientName)
			.then(() => {
				console.log(`Copié dans le presse-papiers: ${ingredientName}`);
			})
			.catch((err) => {
				console.error('Erreur lors de la copie dans le presse-papiers: ', err);
			});

		// Ajoute un focus pour faire apparaître la tooltip
		const element = event.currentTarget as HTMLElement;
		element.focus();

		// Retire le focus après 2 secondes
		setTimeout(() => element.blur(), 1500);
	}

	/**
	 * Fait apparaître les éléments en les rendant visibles.
	 */
	unVanishDiv(): void {
		const vanishingDiv = document.querySelector('.vanishingDiv') as HTMLElement;
		const divMainContainer = document.querySelector('.container') as HTMLElement;

		if (vanishingDiv) {
			vanishingDiv.style.display = 'block';
		}

		if (divMainContainer) {
			divMainContainer.style.paddingTop = '25px';
			divMainContainer.style.marginBottom = '25px';
		}
	}

	/**
	 * Masque les éléments en les rendant invisibles.
	 */
	vanishDiv(): void {
		if (this.selectedItem == '') {
			const vanishingDiv = document.querySelector('.vanishingDiv') as HTMLElement;
			const divMainContainer = document.querySelector('.container') as HTMLElement;

			if (vanishingDiv) {
				vanishingDiv.style.display = 'none';
			}

			if (divMainContainer) {
				divMainContainer.style.paddingTop = '0';
				divMainContainer.style.marginBottom = '6vw';
			}
		}
	}

	getRuneImagePath(runeName: string): string {
		return buildRuneImagePath(runeName);
	}

	/**
	 * Affiche la bulle d'aide.
	 */
	async showHelp(): Promise<void> {
		const { default: Swal } = await import('sweetalert2/dist/sweetalert2.esm.all.js');
		void Swal.fire({
			title: 'Aide',
			width: 640,
			background: '#111b28',
			color: 'rgb(198, 193, 185)',
			customClass: {
				popup: 'help-swal-popup',
				title: 'help-swal-heading',
				htmlContainer: 'help-swal-html',
				confirmButton: 'help-swal-confirm',
			},
			html: `
				<div class="help-swal-content">
					<section class="help-swal-section">
						<h3 class="help-swal-title"><i class="pi pi-calculator" aria-hidden="true"></i>Calculs & estimations</h3>
						<ul>
							<li>Les estimations de kamas prennent d&eacute;j&agrave; en compte la taxe de mise en vente de 2%.</li>
							<li>Les quantit&eacute;s de runes et kamas sont bas&eacute;es sur le prix moyen des runes et les jets moyens d'un item.</li>
						</ul>
					</section>
					<section class="help-swal-section">
						<h3 class="help-swal-title"><i class="pi pi-copy" aria-hidden="true"></i>Interactions</h3>
						<ul>
							<li>Cliquez sur un ingr&eacute;dient pour copier son nom dans le presse-papier.</li>
						</ul>
					</section>
					<section class="help-swal-section">
						<h3 class="help-swal-title"><i class="pi pi-palette" aria-hidden="true"></i>Code couleur des cellules</h3>
						<div class="help-swal-color-list">
							<div class="help-swal-color-item"><span class="help-swal-dot green"></span><span>Vert : rentable au-dessus du taux vis&eacute;</span></div>
							<div class="help-swal-color-item"><span class="help-swal-dot yellow"></span><span>Jaune : rentable mais en dessous du taux vis&eacute;</span></div>
							<div class="help-swal-color-item"><span class="help-swal-dot red"></span><span>Rouge : non rentable</span></div>
						</div>
					</section>
				</div>
			`,
			confirmButtonText: 'Fermer',
		});
	}
}

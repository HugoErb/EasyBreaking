import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, ViewChild } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import { AutoComplete } from 'primeng/autocomplete';

/**
 * Représente une rune mise en cache pour accélérer les calculs.
 */
interface CachedRune {
	effect: string;
	rune: any;
	runeNumerator: number;
	runeRealWeight: number;
	runePrice: number;
	paRunePrice: number;
	raRunePrice: number;
}

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
	runes: any[] = [];
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
	norProfitableBreakRate: number = 0;

	tauxRentabilitePourcentPaRa: number = 0;
	tauxRentabiliteKamasPaRa: number = 0;
	norProfitableBreakRatePaRa: number = 0;

	estimatedItemsBeforeNotProfitable: number = 0;
	estimatedItemsBeforeNotProfitablePaRa: number = 0;

	helpDivvisible: boolean = false;
	sumKamasEarned: number = 0;
	maxFocusedKamasEarned?: number;
	maxValue?: number;
	maxCellColor: string = 'darkgreen';
	maxCellTextColor: string = 'rgb(198, 193, 185)';
	mergeRune: string = 'Aucune';
	maxValuePaRa?: number = 0;

	nombreObjets: number = 1;
	@ViewChild('autoComplete') autoComplete!: AutoComplete;

	// Cache des runes pour éviter les recherches répétées et calculs
	private _cachedRunes: CachedRune[] = [];

	constructor(
		private readonly http: HttpClient,
		private readonly cdr: ChangeDetectorRef,
	) {}

	/**
	 * Initialisation du composant :
	 * - Chargement des runes (localStorage ou JSON)
	 * - Chargement des items (armes + équipements)
	 * - Mise en place du debounce des inputs
	 */
	ngOnInit(): void {
		this.loadRunes();

		const armes$ = this.http.get<any[]>('assets/jsons/armes.json');
		const equipements$ = this.http.get<any[]>('assets/jsons/equipements.json');

		// forkJoin pour charger les deux listes en parallèle
		forkJoin([armes$, equipements$]).subscribe(([armesData, equipementsData]) => {
			this.items = [...this.processData(armesData), ...this.processData(equipementsData)]
				.sort((a, b) => a.name.localeCompare(b.name))
				.map((item) => ({ ...item, nameLower: item.name.toLowerCase() }));
			this.cdr.markForCheck(); // Permet à Angular de revérifier le composant pour màj le DOM avec vos nouvelles valeurs.
		});
	}

	/**
	 * Charge les runes depuis le localStorage ou depuis le JSON
	 * et met à jour this.runes.
	 */
	private loadRunes(): void {
		const stored = localStorage.getItem('runesData');
		if (stored) {
			this.runes = JSON.parse(stored).map((r: any) => ({ ...r, normalizedStat: this.normalizeStat(r.stat) }));
		} else {
			this.http.get<any[]>('assets/jsons/runes.json').subscribe((data) => {
				localStorage.setItem('runesData', JSON.stringify(data));
				this.runes = data.map((r) => ({ ...r, normalizedStat: this.normalizeStat(r.stat) }));
				this.cdr.markForCheck();
			});
		}
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
		this.cdr.detectChanges();
		setTimeout(() => this.autoComplete.inputEL?.nativeElement.blur(), 100);
		this.unVanishDiv();
		this.tauxBrisage = 100;
		const level = this.selectedItem.level;

		this._cachedRunes = this.selectedItem.effects.map((effect: string) => {
			const rune = this.findMatchingRune(effect);
			if (!rune) {
				console.error("[findMatchingRune] Rune introuvable pour l'effet :", effect);
				return null;
			}
			const averageEffectValue = this.calculateAverage(effect);
			const runeNumerator = (3 * rune.weight * averageEffectValue * level) / 200 + 1;
			const runeRealWeight = this.getRealRuneWeight(rune);
			const runePrice = Number.parseFloat(rune.price);
			const paRunePrice = rune.paPrice ? Number.parseFloat(rune.paPrice) : 0;
			const raRunePrice = rune.raPrice ? Number.parseFloat(rune.raPrice) : 0;

			return {
				effect,
				rune,
				runeNumerator,
				runeRealWeight,
				runePrice,
				paRunePrice,
				raRunePrice,
			};
		});

		this.resetStats();
		this.buildTableAndTotals();
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
		this.cdr.markForCheck(); // Permet à Angular de revérifier le composant pour màj le DOM avec vos nouvelles valeurs.
	}

	/**
	 * Construit le tableau des effets (chaque ligne contient quantités et gains)
	 * et calcule sumKamasEarned, maxFocusedKamasEarned et maxValue.
	 */
	private buildTableAndTotals(): void {
		if (this.tauxBrisage != null) {
			this.tauxBrisage = Math.min(this.tauxBrisage, 4000);
		}
		this.sumKamasEarned = 0;

		this.tableauEffects = this._cachedRunes.map(({ effect, rune, runeNumerator, runeRealWeight, runePrice, paRunePrice, raRunePrice }) => {
			// quantités brutes et focus
			const baseQty = this.calculateRuneQuantity(this.tauxBrisage, {
				effect,
				rune,
				runeNumerator,
				runeRealWeight,
				runePrice,
				paRunePrice,
				raRunePrice,
			});
			const focQty = this.calculateRuneQuantityFocused(this.tauxBrisage, effect);
			// quantités PA/RA
			const paQty = rune.paPrice ? focQty / 3 : 0;
			const raQty = rune.raPrice ? focQty / 6 : 0;

			// fonction utilitaire pour arrondir et appliquer taxe
			const calc = (qty: number, priceStr?: string) => Math.round(qty * (priceStr ? Number.parseFloat(priceStr) : 0)) * 0.98;

			const row = {
				stat: effect,
				runeName: rune.name,
				runePrice: rune.price,
				paPrice: rune.paPrice,
				raPrice: rune.raPrice,
				runeImg: rune.img,
				runeQuantity: baseQty.toFixed(2),
				kamasEarned: calc(baseQty, rune.price),
				runeQuantityFocused: focQty.toFixed(2),
				focusedKamasEarned: calc(focQty, rune.price),
				paRuneQuantity: paQty.toFixed(2),
				paKamasEarned: calc(paQty, rune.paPrice),
				raRuneQuantity: raQty.toFixed(2),
				raKamasEarned: calc(raQty, rune.raPrice),
			};

			this.sumKamasEarned += row.kamasEarned;
			return row;
		});

		this.recipe = this.selectedItem.recipe;
		this.maxFocusedKamasEarned = Math.max(...this.tableauEffects.map((r) => r.focusedKamasEarned), 0);
		this.maxValue = Math.max(this.maxFocusedKamasEarned, this.sumKamasEarned);

		this.determineBestMergeRune();
	}

	/**
	 * Détermine si la fusion PA ou RA est la plus rentable
	 * et met à jour mergeRune et maxValuePaRa en conséquence.
	 */
	private determineBestMergeRune(): void {
		if (this.tauxBrisage != null) {
			const bestRow = this.tableauEffects.find((row) => row.focusedKamasEarned === this.maxFocusedKamasEarned);

			if (!bestRow) {
				this.mergeRune = 'Aucune';
				this.maxValuePaRa = 0;
				return;
			}

			const costPA = bestRow.runePrice * 3;
			const costRA = bestRow.runePrice * 9;

			const paProfit = bestRow.paPrice - costPA;
			const raProfit = bestRow.raPrice - costRA;

			const paTotalKamas = Math.round(Number.parseFloat(bestRow.paRuneQuantity) * bestRow.paPrice * 0.98);
			const raTotalKamas = Math.round(Number.parseFloat(bestRow.raRuneQuantity) * bestRow.raPrice * 0.98);

			if (paProfit > raProfit && paProfit > 0) {
				this.mergeRune = 'Pa ' + bestRow.runeName;
				this.maxValuePaRa = paTotalKamas;
			} else if (raProfit > 0) {
				this.mergeRune = 'Ra ' + bestRow.runeName;
				this.maxValuePaRa = raTotalKamas;
			} else {
				this.mergeRune = 'Aucune';
				this.maxValuePaRa = 0;
			}
		}
	}

	/**
	 * Met à jour tous les indicateurs de rentabilité
	 */
	private computeRentabilities(): void {
		if (this.prixCraft == null) {
			this.resetStats();
			return;
		}

		const computeStats = (totalKamas: number, includePaRa: boolean): [number, number, number] => {
			const profit = Math.round(totalKamas - this.prixCraft!);
			const percent = Number.parseFloat(((profit / this.prixCraft!) * 100).toFixed(2));
			const breakRate = this.findNorProfitableBreakRate(includePaRa);
			return [profit, percent, breakRate];
		};

		// Sans fusion
		[this.tauxRentabiliteKamas, this.tauxRentabilitePourcent, this.norProfitableBreakRate] = computeStats(this.maxValue!, false);
		this.estimatedItemsBeforeNotProfitable = this.estimateItemsToReachRate(this.tauxBrisage!, this.norProfitableBreakRate);

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
			this.estimatedItemsBeforeNotProfitablePaRa = this.estimateItemsToReachRate(this.tauxBrisage!, this.norProfitableBreakRatePaRa);
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
		this.nombreObjets = 1;
	}

	/**
	 * Trouve le taux de brisage à partir duquel l'item est (ou n'est plus) rentable.
	 *
	 * @returns Le taux de brisage à partir duquel briser l'item est (ou n'est plus) rentable.
	 */
	findNorProfitableBreakRate(includePaRa: boolean): number {
		const MIN_BREAK_RATE = 0;
		const MAX_BREAK_RATE = 4000;

		let low = MIN_BREAK_RATE;
		let high = MAX_BREAK_RATE;

		// Ce sera notre meilleur taux trouvé (rentable), initialisé à une valeur impossible
		let minimalProfitableRate = MAX_BREAK_RATE;

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
	 * Estime le nombre d'items à briser pour passer du taux actuel au taux cible,
	 * basé sur une formule de machine learning (loi de puissance).
	 *
	 * Formule : items_par_point = 11866408.9284 * taux^(-2.4857) * niveau^(-1.1302)
	 * R² = 0.83, dérivée de 320 observations sur 14 items (niveaux 1-104).
	 *
	 * @param startRate  Taux de brisage actuel (en %)
	 * @param targetRate Taux de brisage cible / seuil de non-rentabilité (en %)
	 * @returns Nombre total d'items estimés à briser
	 */
	private estimateItemsToReachRate(startRate: number, targetRate: number): number {
		if (startRate <= targetRate || !this.selectedItem) return 0;
		const niveau = Math.max(this.selectedItem.level, 1);
		let total = 0;
		for (let rate = startRate; rate > targetRate; rate--) {
			total += 11866408.9284 * Math.pow(rate, -2.4857) * Math.pow(niveau, -1.1302);
		}
		return Math.round(total);
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
		// Si le prix de craft n'est pas défini, on ne peut pas calculer de bénéfice
		if (this.prixCraft == null) {
			return 0;
		}

		let sumKamasEarned = 0;
		let maxFocusedKamasEarned = 0;
		let maxPaRaKamasEarned = 0;

		for (const effect of this.selectedItem.effects) {
			const runeObj = this.findMatchingRune(effect);

			// Calcul pour les runes "standard"
			const cached = this._cachedRunes.find((c) => c.rune === runeObj);
			const qty = cached ? this.calculateRuneQuantity(tauxBrisage, cached) : 0;
			const earned = Math.round(qty * Number.parseFloat(runeObj.price)) * 0.98;
			sumKamasEarned += earned;

			// Calcul pour le focus sur cet effet
			const qtyFoc = this.calculateRuneQuantityFocused(tauxBrisage, effect);
			const earnedFoc = Math.round(qtyFoc * Number.parseFloat(runeObj.price)) * 0.98;
			if (earnedFoc > maxFocusedKamasEarned) {
				maxFocusedKamasEarned = earnedFoc;
			}

			// Si on inclut PA/RA, vérifie quelle fusion rapporte le plus
			if (includePaRa) {
				const paQty = runeObj.paPrice ? qtyFoc / 3 : 0;
				const raQty = runeObj.raPrice ? qtyFoc / 6 : 0;
				const paEarned = Math.round(paQty * (runeObj.paPrice ? Number.parseFloat(runeObj.paPrice) : 0)) * 0.98;
				const raEarned = Math.round(raQty * (runeObj.raPrice ? Number.parseFloat(runeObj.raPrice) : 0)) * 0.98;
				const bestPaRa = Math.max(paEarned, raEarned);
				if (bestPaRa > maxPaRaKamasEarned) {
					maxPaRaKamasEarned = bestPaRa;
				}
			}
		}

		// Détermine la meilleure valeur à soustraire du coût de craft
		let maxValue = Math.max(sumKamasEarned, maxFocusedKamasEarned);
		if (includePaRa && maxPaRaKamasEarned > maxValue) {
			maxValue = maxPaRaKamasEarned;
		}

		// Retourne le bénéfice net arrondi
		return Math.round(maxValue - this.prixCraft);
	}

	/**
	 * Met à jour le prix d'une rune dans le localStorage et dans le cache.
	 * Déclenche aussi un recalcul du tableau.
	 *
	 * @param runeName - Le nom de la rune à modifier.
	 * @param newPrice - Le nouveau prix saisi.
	 */
	updateRunePrice(runeName: string, newPrice: number): void {
		const storedRunes = localStorage.getItem('runesData');
		if (!storedRunes) return;

		try {
			const runeList = JSON.parse(storedRunes);
			const runeIndex = runeList.findIndex((r: any) => r.name === runeName);
			if (runeIndex !== -1) {
				runeList[runeIndex].price = newPrice;
				localStorage.setItem('runesData', JSON.stringify(runeList));

				// Met à jour le cache local aussi
				const cacheIndex = this._cachedRunes.findIndex((r) => r.rune.name === runeName);
				if (cacheIndex !== -1) {
					this._cachedRunes[cacheIndex].rune.price = newPrice;
				}

				// Met à jour la ligne concernée dans tableauEffects
				const row = this.tableauEffects.find((r) => r.runeName === runeName);
				if (row) {
					const qty = Number.parseFloat(row.runeQuantity);
					const qtyFocus = Number.parseFloat(row.runeQuantityFocused);
					const price = Number.parseFloat(newPrice.toString());

					row.runePrice = newPrice;
					row.kamasEarned = Math.round(qty * price * 0.98);
					row.focusedKamasEarned = Math.round(qtyFocus * price * 0.98);
				}

				// Recalcule les totaux et couleurs
				this.sumKamasEarned = this.tableauEffects.reduce((sum, r) => sum + (r.kamasEarned || 0), 0);
				this.maxFocusedKamasEarned = Math.max(...this.tableauEffects.map((r) => r.focusedKamasEarned), 0);
				this.maxValue = Math.max(this.maxFocusedKamasEarned, this.sumKamasEarned);
				this.computeRentabilities();
				this.defineCellColor();
				this.cdr.markForCheck();
			}
		} catch (e) {
			console.error('Erreur lors de la mise à jour du prix des runes dans le localStorage', e);
		}
	}

	/**
	 * Détermine la couleur de la cellule en fonction des valeurs de prixCraft, tauxRentabiliteVise et maxValue.
	 * Met à jour la valeur de maxCellColor correspondante.
	 */
	defineCellColor(): void {
		if (this.prixCraft != undefined && this.tauxRentabiliteVise != undefined) {
			const valeurRentable: number = this.prixCraft * (1 + Number(this.tauxRentabiliteVise) / 100);

			if (valeurRentable >= this.maxValue! && this.maxValue! < this.prixCraft) {
				this.maxCellColor = 'darkred';
				this.maxCellTextColor = 'rgb(198, 193, 185)';
			} else if (this.maxValue! > this.prixCraft && this.maxValue! < valeurRentable) {
				this.maxCellColor = '#e6d600';
				this.maxCellTextColor = '#404d5c';
			} else {
				this.maxCellColor = 'darkgreen';
				this.maxCellTextColor = 'rgb(198, 193, 185)';
			}
		}
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
			const normalizedRuneStat = rune.normalizedStat;

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
		if (!cachedFocused) return 0;

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

	/**
	 * Affiche la bulle d'aide.
	 */
	showHelp() {
		this.helpDivvisible = true;
	}
}

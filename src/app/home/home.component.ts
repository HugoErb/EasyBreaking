import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { forkJoin, Subject, Subscription } from 'rxjs';
import { debounceTime } from 'rxjs/operators';

/**
 * Composant principal de l'application Easy Breaking.
 * Gère la sélection d'un item, l'affichage de ses effets,
 * le calcul des quantités de runes et de la rentabilité.
 */
@Component({
    selector: 'app-home',
    templateUrl: './home.component.html',
    styleUrls: ['./home.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class HomeComponent implements OnInit, OnDestroy {
    // Données de base
    items: any[] = [];
    runes: any[] = [];
    selectedItem: any = null;
    filteredItems: any[] = [];

    // Résultats à l'écran
    tableauEffects: any[] = [];
    recipe: any[] = [];

    // Paramètres utilisateur
    tauxBrisage = 0;
    prixCraft?: number;
    tauxRentabiliteVise: number = 25;

    // Résultats de calculs
    tauxRentabilitePourcent: number = 0;
    tauxRentabiliteKamas: number = 0;
    nonProfitableBreakRate: number = 0;

    tauxRentabilitePourcentPaRa: number = 0;
    tauxRentabiliteKamasPaRa: number = 0;
    nonProfitableBreakRatePaRa: number = 0;

    helpDivvisible: boolean = false;
    sumKamasEarned: number = 0;
    maxFocusedKamasEarned?: number;
    maxValue?: number;
    maxCellColor: string = 'darkgreen';
    maxCellTextColor: string = 'rgb(198, 193, 185)';
    mergeRune: string = 'Aucune';
    maxValuePaRa?: number = 0;

    nombreObjets: number = 1;

    // Debounce / subscription
    private inputsChange$ = new Subject<void>();
    private inputsSub!: Subscription;

    // Cache des runes pour éviter les recherches répétées
    private _cachedRunes: { effect: string; rune: any }[] = [];

    constructor(
        private http: HttpClient,
        private cdr: ChangeDetectorRef
    ) { }

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
            this.items = [
                ...this.processData(armesData),
                ...this.processData(equipementsData)
            ].sort((a, b) => a.name.localeCompare(b.name));
            this.cdr.markForCheck(); // Permet à Angular de revérifier le composant pour màj le DOM avec vos nouvelles valeurs.
        });

        // Débounce des changements d'input avant recalcul
        this.inputsSub = this.inputsChange$
            .pipe(debounceTime(200))
            .subscribe(() => this.recalculate());
    }

    /**
     * Nettoyage des subscriptions lorsqu'on détruit le composant.
     */
    ngOnDestroy(): void {
        this.inputsSub.unsubscribe();
    }

    /**
     * Charge les runes depuis le localStorage ou depuis le JSON
     * et met à jour this.runes.
     */
    private loadRunes(): void {
        const stored = localStorage.getItem('runesData');
        if (stored) {
            this.runes = JSON.parse(stored);
        } else {
            this.http.get<any[]>('assets/jsons/runes.json').subscribe(data => {
                localStorage.setItem('runesData', JSON.stringify(data));
                this.runes = data;
                this.cdr.markForCheck(); // Permet à Angular de revérifier le composant pour màj le DOM avec vos nouvelles valeurs.
            });
        }
    }

    /**
     * Transforme les données brutes JSON en objets simplifiés pour l'affichage.
     * @param data Liste brute d'items
     * @returns Liste d'items formatés
     */
    private processData(data: any[]): any[] {
        return data.map(item => ({
            id: item.id,
            level: item.level,
            name: item.name,
            effects: item.effects,
            recipe: item.recipe,
            type: item.type,
            set: item.set,
            link: item.link
        }));
    }

    /**
     * Filtre les items pour l'autocomplete.
     * @param event L'événement du composant PrimeNG contenant la query
     */
    filterItem(event: any): void {
        const q = event.query.toLowerCase();
        this.filteredItems = this.items.filter(i =>
            i.name.toLowerCase().includes(q)
        );
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

        this.unVanishDiv();

        // Mise en cache des runes
        this._cachedRunes = this.selectedItem.effects.map((eff: string) => ({
            effect: eff,
            rune: this.findMatchingRune(eff)
        }));

        // Construction du tableau d'effets + totaux
        this.buildTableAndTotals();

        // Reset des statistiques de rentabilité
        this.resetStats();

        this.cdr.markForCheck(); // Permet à Angular de revérifier le composant pour màj le DOM avec vos nouvelles valeurs.
    }

    /**
     * Appelé à chaque changement d'un p-inputNumber (tauxBrisage, prixCraft, etc.)
     * - Déclenche le debounce avant recalcul
     */
    onInputChange(): void {
        this.inputsChange$.next();
    }

    /**
     * Recalcule :
     * - Le tableau d'effets + totaux
     * - Les indicateurs de rentabilité
     * - La couleur des cellules
     */
    private recalculate(): void {
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
        // Clamp du taux de brisage
        this.tauxBrisage = Math.min(this.tauxBrisage, 4000);
        this.sumKamasEarned = 0;

        this.tableauEffects = this._cachedRunes.map(({ effect, rune }) => {
            // quantités brutes et focus
            const baseQty = this.calculateRuneQuantity(this.tauxBrisage, rune, effect);
            const focQty = this.calculateRuneQuantityFocused(
                this.tauxBrisage,
                effect,
                this.selectedItem.effects
            );
            // quantités PA/RA
            const paQty = rune.paPrice ? focQty / 3 : 0;
            const raQty = rune.raPrice ? focQty / 6 : 0;

            // fonction utilitaire pour arrondir et appliquer taxe
            const calc = (qty: number, priceStr?: string) =>
                Math.round(qty * (priceStr ? parseFloat(priceStr) : 0)) * 0.98;

            const row = {
                stat: effect,
                runeName: rune.name,
                runePrice: rune.price,
                runeImg: rune.img,
                runeQuantity: baseQty.toFixed(2),
                kamasEarned: calc(baseQty, rune.price),
                runeQuantityFocused: focQty.toFixed(2),
                focusedKamasEarned: calc(focQty, rune.price),
                paRuneQuantity: paQty.toFixed(2),
                paKamasEarned: calc(paQty, rune.paPrice),
                raRuneQuantity: raQty.toFixed(2),
                raKamasEarned: calc(raQty, rune.raPrice)
            };

            this.sumKamasEarned += row.kamasEarned;
            return row;
        });

        this.recipe = this.selectedItem.recipe;
        this.maxFocusedKamasEarned = Math.max(
            ...this.tableauEffects.map(r => r.focusedKamasEarned),
            0
        );
        this.maxValue = Math.max(this.maxFocusedKamasEarned, this.sumKamasEarned);

        this.determineBestMergeRune();
    }

    /**
     * Détermine quelle fusion (Pa/Ra) rapporte le plus et stocke
     * mergeRune et maxValuePaRa.
     */
    private determineBestMergeRune(): void {
        const bestRow = this.tableauEffects.find(
            r => r.focusedKamasEarned === this.maxFocusedKamasEarned
        );
        if (!bestRow) {
            this.mergeRune = 'Aucune';
            this.maxValuePaRa = 0;
            return;
        }
        // on construit la liste des candidats
        const candidates = [
            { type: 'Focused', value: bestRow.focusedKamasEarned },
            { type: 'Pa', value: bestRow.paKamasEarned },
            { type: 'Ra', value: bestRow.raKamasEarned }
        ];
        // on choisit le plus grand
        const winner = candidates.reduce((a, b) => a.value >= b.value ? a : b);
        if (winner.type === 'Pa' || winner.type === 'Ra') {
            this.mergeRune = winner.type;
            this.maxValuePaRa = winner.value;
        } else {
            this.mergeRune = 'Aucune';
            this.maxValuePaRa = 0;
        }
    }

    /**
     * Calcule tous les indicateurs de rentabilité en fonction du prix de craft et
     * des valeurs max (avec ou sans PA/RA).
     */
    private computeRentabilities(): void {
        if (this.prixCraft != null) {
            // rentabilité sans fusion
            this.tauxRentabiliteKamas = Math.round(this.maxValue! - this.prixCraft);
            this.tauxRentabilitePourcent = parseFloat(
                (this.tauxRentabiliteKamas / this.prixCraft * 100).toFixed(2)
            );
            this.nonProfitableBreakRate = this.findNonProfitableBreakRate(false);

            // rentabilité avec fusion Pa/RA
            if (this.mergeRune !== 'Aucune') {
                this.tauxRentabiliteKamasPaRa = Math.round(this.maxValuePaRa! - this.prixCraft);
                this.tauxRentabilitePourcentPaRa = parseFloat(
                    ((this.maxValuePaRa! - this.prixCraft) / this.prixCraft * 100).toFixed(2)
                );
                this.nonProfitableBreakRatePaRa = this.findNonProfitableBreakRate(true);
            } else {
                this.tauxRentabiliteKamasPaRa =
                    this.tauxRentabilitePourcentPaRa =
                    this.nonProfitableBreakRatePaRa = 0;
            }
        }
    }

    /**
     * Remet à zéro les statistiques de la partie "Rentabilité" (avant recalcul).
     */
    private resetStats(): void {
        this.tauxRentabilitePourcent = 0;
        this.tauxRentabiliteKamas = 0;
        this.nonProfitableBreakRate = 0;
        this.tauxRentabilitePourcentPaRa = 0;
        this.tauxRentabiliteKamasPaRa = 0;
        this.nonProfitableBreakRatePaRa = 0;
    }


    /**
     * Trouve le taux de brisage à partir duquel l'item n'est plus rentable.
     *
     * @returns Le taux de brisage à partir duquel briser l'item n'est plus rentable.
     */
    findNonProfitableBreakRate(includePaRa: boolean): number {
        let nonProfitableBreakRate: number = this.tauxBrisage;

        while (nonProfitableBreakRate > 0) {
            const sumKamasEarned = this.calculateBenefit(nonProfitableBreakRate, includePaRa);
            if (sumKamasEarned <= 0) {
                return nonProfitableBreakRate + 1;
            }
            nonProfitableBreakRate--;
        }
        return 1;
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
            const qty = this.calculateRuneQuantity(tauxBrisage, runeObj, effect);
            const earned = Math.round(qty * parseFloat(runeObj.price)) * 0.98;
            sumKamasEarned += earned;

            // Calcul pour le focus sur cet effet
            const qtyFoc = this.calculateRuneQuantityFocused(
                tauxBrisage,
                effect,
                this.selectedItem.effects
            );
            const earnedFoc = Math.round(qtyFoc * parseFloat(runeObj.price)) * 0.98;
            if (earnedFoc > maxFocusedKamasEarned) {
                maxFocusedKamasEarned = earnedFoc;
            }

            // Si on inclut PA/RA, vérifie quelle fusion rapporte le plus
            if (includePaRa) {
                const paQty = runeObj.paPrice ? qtyFoc / 3 : 0;
                const raQty = runeObj.raPrice ? qtyFoc / 6 : 0;
                const paEarned = Math.round(paQty * (runeObj.paPrice ? parseFloat(runeObj.paPrice) : 0)) * 0.98;
                const raEarned = Math.round(raQty * (runeObj.raPrice ? parseFloat(runeObj.raPrice) : 0)) * 0.98;
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
            const normalizedRuneStat = this.normalizeStat(rune.stat);

            // Cas particulier : différencier résistance fixe et %
            if (normalizedItemStat.includes('résistance')) {
                if (hasPercent && !rune.stat.startsWith('%')) return false;
                if (!hasPercent && rune.stat.startsWith('%')) return false;
            }

            return normalizedItemStat.includes(normalizedRuneStat);
        });

        filteredRunes.sort((a: any, b: any) =>
            this.compareByLength(a.stat, b.stat)
        );

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
            .replace(/[^a-zàâçéèêëîïôûùüÿñæœ\s]/gi, '') // supprime les % et autres
            .replace(/\bpo\b/, 'portée')
            .replace(/\bpa\b/, 'pa')
            .replace(/\bpm\b/, 'pm')
            .replace(/\b%?\s*critique(s)?\b/, 'critique')
            .replace(/\bdommage(s)? de poussée\b/, 'dommage poussée')
            .replace(/\bdommage(s)? critiques?\b/, 'dommage critiques')
            .replace(/\b%?\s*résistance(s)?\b/, 'résistance')
            .replace(/\b%?\s*dommage(s)?\b/, 'dommage')
            .replace(/\s+/g, ' ')
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
        const regex = /[0-9]+/g;
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
    calculateRuneQuantity(taux: any, rune: any, effect: any) {
        let realRuneWeight = this.getRealRuneWeight(rune);
        return (((3 * rune.weight * this.calculateAverage(effect) * this.selectedItem.level / 200 + 1) * taux / 100) / realRuneWeight)
    }

    /**
   * Calcule la quantité de runes pour une statistique spécifique en fonction du taux, de la statistique ciblée et de la liste d'effets.
   *
   * @param taux - Le taux de réussite du craft des runes.
   * @param statFocused - La statistique ciblée pour laquelle on souhaite calculer la quantité de runes.
   * @param effectsList - La liste des effets utilisés dans le calcul.
   * @returns La quantité de runes calculée pour la statistique ciblée.
   */
    calculateRuneQuantityFocused(taux: any, statFocused: any, effectsList: any[]): number {
        let runeQuantityFocused = 0;
        let runeFocused = this.findMatchingRune(statFocused);
        let realRuneWeight = this.getRealRuneWeight(runeFocused);

        effectsList.forEach(effect => {
            let effectRune = this.findMatchingRune(effect);

            let res = (3 * effectRune.weight * this.calculateAverage(effect) * this.selectedItem.level / 200 + 1);
            if (effect !== statFocused) {
                res /= 2;
            }
            runeQuantityFocused += res;
        });

        return (runeQuantityFocused / realRuneWeight) * (taux / 100);
    }

    /**
   * Copie le nom de l'ingrédient dans le presse-papiers et affiche une tooltip.
   *
   * @param ingredientName Le nom de l'ingrédient à copier.
   * @param event L'événement MouseEvent associé au clic.
   */
    copyToClipboard(event: MouseEvent, ingredientName: string): void {
        navigator.clipboard.writeText(ingredientName).then(() => {
            console.log(`Copié dans le presse-papiers: ${ingredientName}`);
        }).catch(err => {
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
            divMainContainer.style.paddingTop = '25px'
            divMainContainer.style.marginBottom = '25px'
        }
    }

    /**
     * Masque les éléments en les rendant invisibles.
     */
    vanishDiv(): void {
        if (this.selectedItem == "") {
            const vanishingDiv = document.querySelector('.vanishingDiv') as HTMLElement;
            const divMainContainer = document.querySelector('.container') as HTMLElement;

            if (vanishingDiv) {
                vanishingDiv.style.display = 'none';
            }

            if (divMainContainer) {
                divMainContainer.style.paddingTop = '0'
                divMainContainer.style.marginBottom = '6vw'
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

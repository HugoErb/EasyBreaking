import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { forkJoin } from 'rxjs';

@Component({
    selector: 'app-home',
    templateUrl: './home.component.html',
    styleUrls: ['./home.component.scss']
})
export class HomeComponent {

    constructor(private http: HttpClient) { };
    items: any[] = [];
    runes: any[] = [];
    selectedItem: any;
    filteredItems: any[] = [];
    tableauEffects: any[] = [];
    recipe: any[] = [];
    tauxBrisage: any;
    prixCraft?: any;
    tauxRentabiliteVise: number = 25;
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


    ngOnInit() {

        //Récupération des runes 
        this.loadRunes();

        // Récupération des armes et des équipements
        const armes$ = this.http.get<any[]>('assets/jsons/armes.json');
        const equipements$ = this.http.get<any[]>('assets/jsons/equipements.json');

        forkJoin([armes$, equipements$]).subscribe(([armesData, equipementsData]) => {
            const armes = this.processData(armesData);
            const equipements = this.processData(equipementsData);

            this.items = [...armes, ...equipements];
            this.items.sort((a, b) => a.name.localeCompare(b.name));
        });
    }

    loadRunes() {
        const storedRunes = localStorage.getItem('runesData');
        if (storedRunes) {
            const runesData = JSON.parse(storedRunes);
            this.runes = runesData;
        } else {
            this.http.get('assets/jsons/runes.json').subscribe((data: any) => {
                localStorage.setItem('runesData', JSON.stringify(data));
                this.runes = data;
            });
        }
    }

    private processData(data: any[]): any[] {
        return data.map((item: any) => ({
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
   * Filtre les items en fonction de l'item recherché.
   *
   * @param event - L'événement contenant l'item recherché.
   */
    filterItem(event: any): void {
        const filtered: any[] = [];
        const query: string = event.query.toLowerCase();

        for (const item of this.items) {
            if (item.name.toLowerCase().includes(query)) {
                filtered.push(item);
            }
        }

        this.filteredItems = filtered;
    }

    /**
   * Sélectionne un item et met à jour les données du tableau en fonction de cet item.
   * Affiche les tableaux et les champs de saisie correspondants.
   */
    selectItem(): void {
        this.unVanishDiv()

        let tauxBrisage: number = this.tauxBrisage ? parseInt(this.tauxBrisage) : 0;
        tauxBrisage = tauxBrisage > 4000 ? 4000 : tauxBrisage;
        this.sumKamasEarned = 0;

        // On crée les données du tableau selon l'item sélectionné
        this.tableauEffects = this.selectedItem.effects.map((effect: string) => {
            const runeObj = this.findMatchingRune(effect);

            const runeQuantityFocused = this.calculateRuneQuantityFocused(tauxBrisage, effect, this.selectedItem.effects);
            const baseRuneQuantity = this.calculateRuneQuantity(tauxBrisage, runeObj, effect);
            const paRuneQuantity = runeObj.paPrice ? runeQuantityFocused / 3 : 0;
            const raRuneQuantity = runeObj.raPrice ? runeQuantityFocused / 6 : 0;

            const kamasEarned = Math.round(baseRuneQuantity * parseFloat(runeObj.price)) * 0.98;
            const paKamasEarned = Math.round(paRuneQuantity * (runeObj.paPrice ? parseFloat(runeObj.paPrice) : 0)) * 0.98;
            const raKamasEarned = Math.round(raRuneQuantity * (runeObj.raPrice ? parseFloat(runeObj.raPrice) : 0)) * 0.98;

            this.sumKamasEarned += kamasEarned;

            return {
                stat: effect,
                runeName: runeObj.name,
                runePrice: runeObj.price,
                runeImg: runeObj.img,
                runeQuantity: baseRuneQuantity.toFixed(2),
                kamasEarned: kamasEarned,
                runeQuantityFocused: runeQuantityFocused.toFixed(2),
                focusedKamasEarned: Math.round(runeQuantityFocused * parseFloat(runeObj.price)) * 0.98,
                paRuneQuantity: paRuneQuantity.toFixed(2),
                paKamasEarned: paKamasEarned,
                raRuneQuantity: raRuneQuantity.toFixed(2),
                raKamasEarned: raKamasEarned
            };
        });

        this.recipe = this.selectedItem.recipe;
        this.maxFocusedKamasEarned = Math.max(...this.tableauEffects.map(item => item.focusedKamasEarned));
        this.maxValue = Math.max(this.maxFocusedKamasEarned, this.sumKamasEarned);


        if (this.tauxBrisage != undefined) {
            // Trouver l'item avec maxFocusedKamasEarned
            const itemWithMaxFocusedKamas = this.tableauEffects.find(item => item.focusedKamasEarned === this.maxFocusedKamasEarned);

            if (itemWithMaxFocusedKamas) {
                // Comparer les valeurs pour cet item spécifique
                this.maxValuePaRa = Math.max(
                    this.maxFocusedKamasEarned,
                    itemWithMaxFocusedKamas.paKamasEarned ?? 0,
                    itemWithMaxFocusedKamas.raKamasEarned ?? 0
                );

                // Déterminer le type de rune le plus rentable
                if (this.maxValuePaRa === itemWithMaxFocusedKamas.paKamasEarned) {
                    this.mergeRune = 'Pa';
                } else if (this.maxValuePaRa === itemWithMaxFocusedKamas.raKamasEarned) {
                    this.mergeRune = 'Ra';
                } else {
                    this.mergeRune = 'Aucune';
                    this.maxValuePaRa = 0;
                }
            } else {
                this.mergeRune = 'Aucune';
                this.maxValuePaRa = 0;
            }
        }


        this.tauxRentabilitePourcent = 0;
        this.tauxRentabiliteKamas = 0;
        this.nonProfitableBreakRate = 0;
        if (this.prixCraft != undefined && this.tauxBrisage != undefined) {
            this.tauxRentabiliteKamas = Math.round(this.maxValue! - this.prixCraft);
            this.tauxRentabilitePourcent = parseFloat((this.tauxRentabiliteKamas / this.prixCraft * 100).toFixed(2));

            this.nonProfitableBreakRate = this.findNonProfitableBreakRate(false);
        }

        this.tauxRentabilitePourcentPaRa = 0;
        this.tauxRentabiliteKamasPaRa = 0;
        this.nonProfitableBreakRatePaRa = 0;
        if (this.prixCraft != undefined && this.tauxBrisage != undefined && this.mergeRune != 'Aucune') {

            this.tauxRentabilitePourcentPaRa = parseFloat(((this.maxValuePaRa! - this.prixCraft) / this.prixCraft * 100).toFixed(2));
            this.tauxRentabiliteKamasPaRa = Math.round(this.maxValuePaRa! - this.prixCraft);

            this.nonProfitableBreakRatePaRa = this.findNonProfitableBreakRate(true);
        }
        this.defineCellColor();
    }

    /**
     * Trouve le taux de brisage à partir duquel l'item n'est plus rentable.
     *
     * @returns Le taux de brisage à partir duquel briser l'item n'est plus rentable.
     */
    findNonProfitableBreakRate(includePaRa: boolean): number {
        let nonProfitableBreakRate = parseInt(this.tauxBrisage);

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
     * @returns Le bénéfice total en Kamas après soustraction du coût de production de l'item.
     */
    calculateBenefit(tauxBrisage: number, includePaRa: boolean): number {
        let sumKamasEarned = 0;
        let maxFocusedKamasEarned = 0;
        let maxPaRaKamasEarned = 0;

        this.selectedItem.effects.forEach((effect: string) => {
            const runeObj = this.findMatchingRune(effect);

            // Calculs pour les runes standard
            const runeQuantity = this.calculateRuneQuantity(tauxBrisage, runeObj, effect);
            const kamasEarned = Math.round(runeQuantity * parseFloat(runeObj.price)) * 0.98;
            sumKamasEarned += kamasEarned;

            // Calculs pour les runes focused
            const runeQuantityFocused = this.calculateRuneQuantityFocused(tauxBrisage, effect, this.selectedItem.effects);
            const focusedKamasEarned = Math.round(runeQuantityFocused * parseFloat(runeObj.price)) * 0.98;
            if (focusedKamasEarned > maxFocusedKamasEarned) {
                maxFocusedKamasEarned = focusedKamasEarned;
            }

            // Calculs pour les runes PA et RA, si applicable
            if (includePaRa) {
                const paRuneQuantity = runeObj.paPrice ? runeQuantityFocused / 3 : 0;
                const raRuneQuantity = runeObj.raPrice ? runeQuantityFocused / 6 : 0;
                const paKamasEarned = Math.round(paRuneQuantity * (runeObj.paPrice ? parseFloat(runeObj.paPrice) : 0)) * 0.98;
                const raKamasEarned = Math.round(raRuneQuantity * (runeObj.raPrice ? parseFloat(runeObj.raPrice) : 0)) * 0.98;
                const maxValuePaRa = Math.max(paKamasEarned, raKamasEarned);

                if (maxValuePaRa > maxPaRaKamasEarned) {
                    maxPaRaKamasEarned = maxValuePaRa;
                }
            }
        });

        // Choix de la valeur maximale à retourner en fonction de includePaRa
        let maxValue = Math.max(maxFocusedKamasEarned, sumKamasEarned);
        if (includePaRa && maxPaRaKamasEarned > maxValue) {
            maxValue = maxPaRaKamasEarned;
        }

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
        const normalize = (str: string) => str
            .toLowerCase()
            .replace(/[^a-zàâçéèêëîïôûùüÿñæœ\s]/gi, '') // supprime ponctuation
            .trim();

        const stats: string[] = this.runes.map((rune: any) => rune.stat);
        const normalizedItemStat = normalize(itemStatistic);

        const filteredStats: string[] = stats.filter((stat: string) =>
            normalizedItemStat.includes(normalize(stat))
        );

        filteredStats.sort(this.compareByLength);

        return this.runes.find((rune: any) => rune.stat === filteredStats[0]);
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

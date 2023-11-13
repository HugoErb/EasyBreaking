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
  tableau: any[] = [];
  tauxBrisage: any;
  prixCraft?: any;
  tauxRentabiliteVise: number = 25;
  tauxRentabilitePourcent: number = 0;
  tauxRentabiliteKamas: number = 0;
  sumKamasEarned: number = 0;
  maxFocusedKamasEarned?: number;
  maxValue?: number;
  maxCellColor: string = 'darkgreen';
  maxCellTextColor: string = 'rgb(198, 193, 185)';

  ngOnInit() {

    // Récuperation des runes
    this.http.get('assets/jsons/runes.json').subscribe((data: any) => {
      data.forEach((rune: any) => {
        this.runes.push({
          name: rune.Name,
          stat: rune.Stat,
          img: rune.Img,
          price: rune.Price,
          weight: rune.Weight,
          raPrice: rune.RaPrice,
          paPrice: rune.PaPrice,
        });
      });
    });

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

  private processData(data: any[]): any[] {
    return data.map((item: any) => ({
      id: item.id,
      level: item.level,
      name: item.name,
      effects: item.effects,
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
    // On fait apparaître les tableaux et les champs de saisie
    const itemTableElement = document.querySelector('.itemTable') as HTMLElement;
    const inputTexts = document.querySelector('.inputTexts') as HTMLElement;

    if (itemTableElement) {
      itemTableElement.style.display = 'block';
    }
    if (inputTexts) {
      inputTexts.style.display = 'flex';
    }

    const tauxBrisage: number = this.tauxBrisage ? parseInt(this.tauxBrisage) : 0;
    this.sumKamasEarned = 0;

    // On crée les données du tableau selon l'item sélectionné
    this.tableau = this.selectedItem.effects.map((effect: string) => {
      const runeObj = this.findMatchingRune(effect);
      const runeQuantityFocused = this.calculateRuneQuantityFocused(tauxBrisage, effect, this.selectedItem.effects);
      const runeQuantity = this.calculateRuneQuantity(tauxBrisage, runeObj, effect);
      const kamasEarned = Math.round(runeQuantity * parseFloat(runeObj.price)) * 0.98;
      this.sumKamasEarned += kamasEarned;

      return {
        stat: effect,
        runeName: runeObj.name,
        runePrice: runeObj.price,
        runeImg: runeObj.img,
        runeQuantity: runeQuantity.toFixed(2),
        kamasEarned: kamasEarned,
        runeQuantityFocused: runeQuantityFocused.toFixed(2),
        focusedKamasEarned: Math.round(runeQuantityFocused * parseFloat(runeObj.price)) * 0.98
      };
    });

    this.maxFocusedKamasEarned = Math.max(...this.tableau.map(item => item.focusedKamasEarned));
    this.maxValue = Math.max(this.maxFocusedKamasEarned, this.sumKamasEarned);
    this.defineCellColor();
  }

  /**
 * Détermine la couleur de la cellule en fonction des valeurs de prixCraft, tauxRentabiliteVise et maxValue.
 * Met à jour la valeur de maxCellColor correspondante.
 */
  defineCellColor(): void {
    if (this.prixCraft != undefined && this.tauxRentabiliteVise != undefined) {
      const valeurRentable: number = this.prixCraft * (1 + Number(this.tauxRentabiliteVise) / 100);
      this.tauxRentabilitePourcent = parseFloat(((this.maxValue! - this.prixCraft) / this.prixCraft * 100).toFixed(2));
      this.tauxRentabiliteKamas = Math.round(this.maxValue! - this.prixCraft);

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
  findMatchingRune(itemStatistic: any): any {
    const stats: string[] = this.runes.map((rune: any) => rune.stat);
    const filteredStats: string[] = stats.filter((stat: string) => itemStatistic.includes(stat));
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
    } else if (rune.stat === 'Pods') {
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
   * Masque les éléments de tableau et de texte en les rendant invisibles.
   */
  vanishDiv(): void {
    const table = document.querySelector('.itemTable') as HTMLElement;
    const inputTexts = document.querySelector('.inputTexts') as HTMLElement;

    if (table) {
      table.style.display = 'none';
    }

    if (inputTexts) {
      inputTexts.style.display = 'none';
    }
  }

}

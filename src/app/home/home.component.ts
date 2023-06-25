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
  prixCraft: any;
  tauxRentabilite: any = 25;

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

  matchRunesWithEffects(stat: string, return_value: string) {
    const runeObj = this.runes.filter((rune: any) => stat.includes(rune.stat))[0];
    return runeObj[return_value];
  }

  filterItem(event: any) {
    let filtered: any[] = [];
    let query = event.query;

    for (let i = 0; i < this.items.length; i++) {
      let item = this.items[i];
      if (item.name.toLowerCase().indexOf(query.toLowerCase()) >= 0) {
        filtered.push(item);
      }
    }

    this.filteredItems = filtered;
  }

  selectItem() {

    // On fait apparaître les tableau et les input texts
    const itemTableElement = document.querySelector('.itemTable') as HTMLElement;
    const inputTexts = document.querySelector('.inputTexts') as HTMLElement;

    if (itemTableElement) {
      itemTableElement.style.display = 'block';
    }
    if (inputTexts) {
      inputTexts.style.display = 'flex';
    }

    let tauxBrisage: any;
    if (this.tauxBrisage) {
      tauxBrisage = parseInt(this.tauxBrisage)
    } else {
      tauxBrisage = 0
    }

    //On crée les données du tableau selon l'item selectionné
    this.tableau = this.selectedItem.effects.map((effect: string) => {
      const runeObj = this.findMatchingRune(effect);
      let runeQuantityFocused = this.calculateRuneQuantityFocused(tauxBrisage, effect, this.selectedItem.effects);

      return {
        stat: effect,
        runeName: runeObj.name,
        runePrice: runeObj.price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' '),
        runeImg: runeObj.img,
        runeQuantity: this.calculateRuneQuantity(tauxBrisage, runeObj, effect).toFixed(2).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' '),
        runeQuantityFocused: runeQuantityFocused.toFixed(2).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' '),
        focusedRunePrice: Math.round(runeQuantityFocused * parseFloat(runeObj.price)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
      };
    });
  }

  findMatchingRune(itemStatistic: any) {
    const stats: string[] = this.runes.map((rune: any) => rune.stat);
    const filteredStats: string[] = stats.filter((stat: string) => itemStatistic.includes(stat));
    filteredStats.sort(this.compareByLength);
    console.log(filteredStats);
    
    return this.runes.find((rune: any) => rune.stat === filteredStats[0]);
  }

  compareByLength(a: string, b: string): number {
    return b.length - a.length;
  }

  calculateAverage(value: string): number {

    const numbers: number[] = [];
    let start = -1;
    let end = -1;

    for (let i = 0; i < value.length; i++) {
      const char = value[i];
      if (char >= '0' && char <= '9') {
        if (start === -1) {
          start = i;
        }
        end = i;
      } else if (char === 'à') {
        if (start !== -1 && end !== -1) {
          numbers.push(parseInt(value.substring(start, end + 1), 10));
          start = -1;
          end = -1;
        }
      }
    }

    if (start !== -1 && end !== -1) {
      numbers.push(parseInt(value.substring(start, end + 1), 10));
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

  getRealRuneWeight(rune: any) {
    let runeWeight = rune.weight;
    if (rune.stat === 'Vitalité' || rune.stat === 'Initiative') {
      runeWeight = 1;
    } else if (rune.stat === 'Pods') {
      runeWeight = 2.5;
    }
    return runeWeight;
  }

  calculateRuneQuantity(taux: any, rune: any, effect: any) {
    let realRuneWeight = this.getRealRuneWeight(rune);
    return (((3 * rune.weight * this.calculateAverage(effect) * this.selectedItem.level / 200 + 1) * taux / 100) / realRuneWeight)
  }

  calculateRuneQuantityFocused(taux: any, statFocused: any, effectsList: any[]) {
    let runeQuantityFocused = 0;
    let runeFocused = this.findMatchingRune(statFocused);
    let realRuneWeight = this.getRealRuneWeight(runeFocused);
    effectsList.forEach(effect => {
      let runeEffect = this.findMatchingRune(statFocused);
      let res = this.calculateRuneQuantity(taux, runeEffect, effect);
      if (effect != statFocused) {
        res = res / 2;
      }
      runeQuantityFocused += res;
    });
    return runeQuantityFocused / realRuneWeight;
  }

  vanishDiv() {
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

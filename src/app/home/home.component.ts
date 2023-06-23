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
  tauxBrisage : any;
  prixCraft : any;
  tauxRentabilite : any;

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

  selectItem(selectedItem: any) {

    const itemTableElement = document.querySelector('.itemTable') as HTMLElement;

    if (itemTableElement) {
      itemTableElement.style.display = 'block';
    }
    this.tableau = this.selectedItem.effects.map((value: string) => {
      const stats: string[] = this.runes.map((rune: any) => rune.stat);
      const filteredStats: string[] = stats.filter((stat: string) => value.includes(stat));
      filteredStats.sort(this.compareByLength);
      const runeObj = this.runes.find((rune: any) => rune.stat === filteredStats[0]);
      
      return {
        stat: value,
        runeName: runeObj.name,
        runePrice: runeObj.price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' '),
        runeImg: runeObj.img,
        runeQuantity: this.calculateRuneQuantity(100, runeObj, value).toFixed(2).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' '),
        runeQuantityFocused: this.calculateRuneQuantityFocused(100, runeObj, value).toFixed(2).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' '),
        focusedRunePrice: Math.round(this.calculateRuneQuantityFocused(100, runeObj, value) * parseFloat(runeObj.price)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
      };
    });
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

  calculateRuneQuantity(taux: any, rune: any, stat: any) {
    return (((3 * rune.weight * this.calculateAverage(stat) * this.selectedItem.level / 200 + 1) * 100 / 100) / rune.weight)
  }

  calculateRuneQuantityFocused(taux: any, rune: any, statFocused: any) {
    return (((3 * rune.weight * this.calculateAverage(statFocused) * this.selectedItem.level / 200 + 1) * 100 / 100) / rune.weight)
  }

  checkEmptyText() {
    const itemTableElement = document.querySelector('.itemTable') as HTMLElement;

    if (itemTableElement) {
      itemTableElement.style.display = 'none';
    }
  }

}

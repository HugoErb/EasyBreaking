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
  selectedItem: any;
  filteredItems: any[] = [];

  ngOnInit() {
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
  }

  checkEmptyText() {
    const itemTableElement = document.querySelector('.itemTable') as HTMLElement;

    if (itemTableElement) {
      itemTableElement.style.display = 'none';
    }
  }

}

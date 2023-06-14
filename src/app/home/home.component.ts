import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';

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

    // Récuperation des armes
    this.http.get('assets/jsons/armes.json').subscribe((data: any) => {
      data.forEach((item: any) => {
        this.items.push({
          id: item.id,
          img: item.img,
          name: item.text,
          effects: item.effects,
        });
      });
    });

    // Récuperation des équipements
    this.http.get('assets/jsons/equipements.json').subscribe((data: any) => {
      data.forEach((item: any) => {
        this.items.push({
          id: item.id,
          img: item.img,
          name: item.text,
          effects: item.effects,
        });
      });
    });

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

}

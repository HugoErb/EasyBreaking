import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-runes-manager',
  templateUrl: './runes-manager.component.html',
  styleUrls: ['./runes-manager.component.scss']
})
export class RunesManagerComponent implements OnInit {
  runes: any[] = [];

  constructor(private http: HttpClient) { }

  ngOnInit() {
    this.loadRunes();
  }

  loadRunes() {
    const storedRunes = localStorage.getItem('runesData');
    if (storedRunes) {
      const runesData = JSON.parse(storedRunes);
      this.initializeRunes(runesData);
    } else {
      this.http.get('assets/jsons/runes.json').subscribe((data: any) => {
        localStorage.setItem('runesData', JSON.stringify(data));
        this.initializeRunes(data);
      });
    }
  }

  initializeRunes(data: any[]) {
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
  }

  saveChanges(): void {
    // this.runeService.updateRunes(this.runes).subscribe(result => {
    //   // Gérer le retour de l'opération
    // });
  }
}

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
      this.runes = runesData;

    } else {
      this.http.get('assets/jsons/runes.json').subscribe((data: any) => {
        localStorage.setItem('runesData', JSON.stringify(data));
        this.runes = data;
      });
    }
  }

  onPriceChange(runeIndex: number, priceType: string, event: any) {
    const newPrice = parseFloat(event.target.value);
    this.runes[runeIndex][priceType] = newPrice;
  }

  saveChanges(): void {
    console.log(this.runes);
    localStorage.setItem('runesData', JSON.stringify(this.runes));
  }
}

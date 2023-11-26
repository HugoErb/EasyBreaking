import { Component, OnInit } from '@angular/core';
import { RuneService } from '../rune-service.service';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-runes-manager',
  templateUrl: './runes-manager.component.html',
  styleUrls: ['./runes-manager.component.scss']
})
export class RunesManagerComponent implements OnInit {
  runes: any[] = [];

  constructor(private runeService: RuneService, private http: HttpClient) { }

  ngOnInit(): void {
    // this.runeService.getRunes().subscribe(data => {
    //   this.runes = data;
    // });
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
  }

  saveChanges(): void {
    // this.runeService.updateRunes(this.runes).subscribe(result => {
    //   // Gérer le retour de l'opération
    // });
  }
}

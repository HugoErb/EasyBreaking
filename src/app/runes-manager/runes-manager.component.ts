import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

@Component({
  selector: 'app-runes-manager',
  templateUrl: './runes-manager.component.html',
  styleUrls: ['./runes-manager.component.scss']
})
export class RunesManagerComponent implements OnInit {
  runes: any[] = [];

  constructor(private http: HttpClient, private router: Router) { }

  ngOnInit() {
    this.loadRunes();
  }

  loadRunes() {
    const storedRunes = localStorage.getItem('runesData');
    if (storedRunes) {
      const runesData = JSON.parse(storedRunes);
      this.runes = runesData.map((rune: any) => ({
        ...rune,
        paPrice: rune.paPrice !== null ? rune.paPrice : undefined,
        raPrice: rune.raPrice !== null ? rune.raPrice : undefined
      }));
    } else {
      this.http.get('assets/jsons/runes.json').subscribe((data: any) => {
        const initializedData = data.map((rune: any) => ({
          ...rune,
          paPrice: rune.paPrice !== null ? rune.paPrice : undefined,
          raPrice: rune.raPrice !== null ? rune.raPrice : undefined
        }));
        localStorage.setItem('runesData', JSON.stringify(initializedData));
        this.runes = initializedData;
      });
    }
  }


  onPriceChange(runeIndex: number, priceType: string, event: any) {
    const newPrice = parseFloat(event.target.value);
    this.runes[runeIndex][priceType] = newPrice;
  }

  saveChanges(): void {
    localStorage.setItem('runesData', JSON.stringify(this.runes));
    this.goToHomePage()
  }

  goToHomePage() {
    this.router.navigate(['']); // Utilisez le chemin approprié pour votre page d'accueil
  }

  /**
   * Copie le nom de la rune dans le presse-papiers et affiche une tooltip.
   *
   * @param runeName Le nom de la rune à copier.
   * @param event L'événement MouseEvent associé au clic.
   */
  copyToClipboard(event: MouseEvent, runeName: string): void {
    navigator.clipboard.writeText(runeName).then(() => {
      console.log(`Copié dans le presse-papiers: ${runeName}`);
    }).catch(err => {
      console.error('Erreur lors de la copie dans le presse-papiers: ', err);
    });

    // Ajoute un focus pour faire apparaître la tooltip
    const element = event.currentTarget as HTMLElement;
    element.focus();

    // Retire le focus après 2 secondes
    setTimeout(() => element.blur(), 1500);
  }
}

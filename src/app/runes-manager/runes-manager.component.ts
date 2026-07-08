import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

@Component({
    selector: 'app-runes-manager',
    templateUrl: './runes-manager.component.html',
    styleUrls: ['./runes-manager.component.scss'],
    standalone: false
})
export class RunesManagerComponent implements OnInit {
    runes: any[] = [];

    constructor(private readonly http: HttpClient, private readonly router: Router) {}

    ngOnInit() {
        this.loadRunes();
    }

    loadRunes() {
        const storedRunes = localStorage.getItem('runesData');
        if (storedRunes) {
            const runesData = JSON.parse(storedRunes);
            this.runes = runesData.map((rune: any) => ({
                ...rune,
                paPrice: rune.paPrice === null ? undefined : rune.paPrice,
                raPrice: rune.raPrice === null ? undefined : rune.raPrice,
            }));
        } else {
            this.http.get('assets/jsons/runes.json').subscribe((data: any) => {
                const initializedData = data.map((rune: any) => ({
                    ...rune,
                    paPrice: rune.paPrice === null ? undefined : rune.paPrice,
                    raPrice: rune.raPrice === null ? undefined : rune.raPrice,
                }));
                localStorage.setItem('runesData', JSON.stringify(initializedData));
                this.runes = initializedData;
            });
        }
    }

    onPriceChange(runeIndex: number, priceType: string, newPrice: number) {
        this.runes[runeIndex][priceType] = newPrice;
        localStorage.setItem('runesData', JSON.stringify(this.runes));
    }

    async confirmResetAllPrices(): Promise<void> {
        const { default: Swal } = await import('sweetalert2/dist/sweetalert2.esm.all.js');
        const result = await Swal.fire({
            title: 'Reset des prix',
            text: 'Tous les prix des runes seront remis a 1.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Confirmer',
            cancelButtonText: 'Annuler',
        });

        if (result.isConfirmed) {
            this.resetAllPrices();
        }
    }

    resetAllPrices(): void {
        this.runes = this.runes.map((rune: any) => ({
            ...rune,
            price: 1,
            paPrice: rune.paPrice !== undefined ? 1 : undefined,
            raPrice: rune.raPrice !== undefined ? 1 : undefined,
        }));
        localStorage.setItem('runesData', JSON.stringify(this.runes));
    }

    async confirmDeleteLocalStorage(): Promise<void> {
        const { default: Swal } = await import('sweetalert2/dist/sweetalert2.esm.all.js');
        const result = await Swal.fire({
            title: 'Hard reset',
            text: 'Toutes les donnees du localStorage seront supprimees.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Supprimer',
            cancelButtonText: 'Annuler',
        });

        if (result.isConfirmed) {
            this.deleteLocalStorage();
        }
    }

    deleteLocalStorage(): void {
        localStorage.clear();
        this.loadRunes();
    }

    exportRunesData(): void {
        const runesData = localStorage.getItem('runesData') ?? JSON.stringify(this.runes);
        const blob = new Blob([JSON.stringify(JSON.parse(runesData), null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');

        link.href = url;
        link.download = 'runesData.json';
        link.click();
        URL.revokeObjectURL(url);
    }

    importRunesData(event: Event): void {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];

        if (!file) {
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            try {
                const importedRunes = JSON.parse(String(reader.result));
                if (!Array.isArray(importedRunes)) {
                    throw new Error('Le fichier importe doit contenir une liste de runes.');
                }

                localStorage.setItem('runesData', JSON.stringify(importedRunes));
                this.loadRunes();
            } catch (error) {
                console.error("Erreur lors de l'import du fichier runesData JSON", error);
            } finally {
                input.value = '';
            }
        };
        reader.readAsText(file);
    }

    goToHomePage() {
        this.router.navigate(['']);
    }

    /**
     * Copie le nom de la rune dans le presse-papiers et affiche une tooltip.
     *
     * @param runeName Le nom de la rune à copier.
     * @param event L'événement MouseEvent associé au clic.
     */
    copyToClipboard(event: MouseEvent, runeName: string): void {
        navigator.clipboard
            .writeText(runeName)
            .then(() => {
                console.log(`Copié dans le presse-papiers: ${runeName}`);
            })
            .catch((err) => {
                console.error('Erreur lors de la copie dans le presse-papiers: ', err);
            });

        // Ajoute un focus pour faire apparaître la tooltip
        const element = event.currentTarget as HTMLElement;
        element.focus();

        // Retire le focus après 2 secondes
        setTimeout(() => element.blur(), 1500);
    }
}

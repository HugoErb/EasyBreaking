import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { getRuneImagePath as buildRuneImagePath, parseRunesData, readStoredRunes, RuneData, storeRunes } from '../rune-data';
import { formatTranscendenceRuneName, TranscendenceRuneData } from '../exotic-effects';
import {
    applyStoredTranscendencePrices,
    PricedTranscendenceRuneData,
    storeTranscendencePrices,
} from '../transcendence-rune-prices';

type RuneSortColumn = 'name' | 'price' | 'paPrice' | 'raPrice';
type RunePriceColumn = Exclude<RuneSortColumn, 'name'>;
type TranscendenceRuneSortColumn = 'name' | 'effect' | 'price';
type SortDirection = 'asc' | 'desc';

@Component({
    selector: 'app-runes-manager',
    templateUrl: './runes-manager.component.html',
    styleUrls: ['./runes-manager.component.scss'],
    standalone: false
})
export class RunesManagerComponent implements OnInit {
    runes: RuneData[] = [];
    transcendenceRunes: PricedTranscendenceRuneData[] = [];
    sortColumn: RuneSortColumn = 'name';
    sortDirection: SortDirection = 'asc';
    transcendenceSortColumn: TranscendenceRuneSortColumn = 'name';
    transcendenceSortDirection: SortDirection = 'asc';

    constructor(private readonly http: HttpClient) {}

    ngOnInit() {
        this.loadRunes();
        this.loadTranscendenceRunes();
    }

    loadTranscendenceRunes(): void {
        this.http.get<TranscendenceRuneData[]>('assets/jsons/transcendenceRunes.json').subscribe((runes) => {
            this.transcendenceRunes = applyStoredTranscendencePrices(runes);
            this.applyTranscendenceSort();
        });
    }

    loadRunes() {
        const storedRunes = readStoredRunes();
        if (storedRunes) {
            this.runes = storedRunes.map((rune) => ({
                ...rune,
                paPrice: rune.paPrice === null ? undefined : rune.paPrice,
                raPrice: rune.raPrice === null ? undefined : rune.raPrice,
            }));
            this.applySort();
        } else {
            this.http.get<unknown>('assets/jsons/runes.json').subscribe((data) => {
                const defaultRunes = parseRunesData(data);
                if (!defaultRunes) {
                    console.error('Le fichier de runes par défaut est invalide.');
                    return;
                }

                const initializedData = defaultRunes.map((rune) => ({
                    ...rune,
                    paPrice: rune.paPrice === null ? undefined : rune.paPrice,
                    raPrice: rune.raPrice === null ? undefined : rune.raPrice,
                }));
                storeRunes(initializedData);
                this.runes = initializedData;
                this.applySort();
            });
        }
    }

    onPriceChange(runeIndex: number, priceType: RunePriceColumn, newPrice: number) {
        this.runes[runeIndex][priceType] = newPrice;
        storeRunes(this.runes);
    }

    onTranscendencePriceChange(runeIndex: number, newPrice: number): void {
        this.transcendenceRunes[runeIndex].price = newPrice;
        storeTranscendencePrices(this.transcendenceRunes);
    }

    sortTranscendenceBy(column: TranscendenceRuneSortColumn): void {
        this.transcendenceSortDirection =
            this.transcendenceSortColumn === column && this.transcendenceSortDirection === 'asc' ? 'desc' : 'asc';
        this.transcendenceSortColumn = column;
        this.applyTranscendenceSort();
    }

    private applyTranscendenceSort(): void {
        const direction = this.transcendenceSortDirection === 'asc' ? 1 : -1;
        this.transcendenceRunes = [...this.transcendenceRunes].sort((first, second) => {
            if (this.transcendenceSortColumn === 'price') return (first.price - second.price) * direction;
            if (this.transcendenceSortColumn === 'effect') {
                const statComparison = first.stat.localeCompare(second.stat, 'fr', { sensitivity: 'accent' });
                return (statComparison || first.value - second.value) * direction;
            }
            return first.name.localeCompare(second.name, 'fr', { sensitivity: 'accent' }) * direction;
        });
    }

    sortBy(column: RuneSortColumn): void {
        this.sortDirection = this.sortColumn === column && this.sortDirection === 'asc' ? 'desc' : 'asc';
        this.sortColumn = column;
		this.applySort();
	}

	private applySort(): void {
		const column = this.sortColumn;
        this.runes = [...this.runes].sort((firstRune, secondRune) => {
            const firstValue = firstRune[column];
            const secondValue = secondRune[column];

            if (firstValue == null && secondValue == null) return 0;
            if (firstValue == null) return 1;
            if (secondValue == null) return -1;

            const firstNumber = Number(firstValue);
            const secondNumber = Number(secondValue);
            const comparison =
                column !== 'name' && Number.isFinite(firstNumber) && Number.isFinite(secondNumber)
                    ? firstNumber - secondNumber
                    : String(firstValue).localeCompare(String(secondValue), 'fr', { numeric: true, sensitivity: 'accent' });
            return this.sortDirection === 'asc' ? comparison : -comparison;
        });
    }

    getSortIcon(column: RuneSortColumn): string {
        if (this.sortColumn !== column) return 'pi pi-sort-alt';
        return this.sortDirection === 'asc' ? 'pi pi-sort-amount-up' : 'pi pi-sort-amount-down';
    }

    getAriaSort(column: RuneSortColumn): 'ascending' | 'descending' | 'none' {
        if (this.sortColumn !== column) return 'none';
        return this.sortDirection === 'asc' ? 'ascending' : 'descending';
    }

    getTranscendenceSortIcon(column: TranscendenceRuneSortColumn): string {
        if (this.transcendenceSortColumn !== column) return 'pi pi-sort-alt';
        return this.transcendenceSortDirection === 'asc' ? 'pi pi-sort-amount-up' : 'pi pi-sort-amount-down';
    }

    getTranscendenceAriaSort(column: TranscendenceRuneSortColumn): 'ascending' | 'descending' | 'none' {
        if (this.transcendenceSortColumn !== column) return 'none';
        return this.transcendenceSortDirection === 'asc' ? 'ascending' : 'descending';
    }

    getRuneImagePath(runeName: string): string {
        return buildRuneImagePath(runeName);
    }

    getTranscendenceRuneName(runeName: string): string {
        return formatTranscendenceRuneName(runeName);
    }

    async confirmResetAllPrices(): Promise<void> {
        const { default: Swal } = await import('sweetalert2/dist/sweetalert2.esm.all.js');
        const result = await Swal.fire({
            title: 'Reset des prix',
            text: 'Tous les prix des runes seront remis à 1.',
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
        this.runes = this.runes.map((rune) => ({
            ...rune,
            price: 1,
            paPrice: rune.paPrice !== undefined ? 1 : undefined,
            raPrice: rune.raPrice !== undefined ? 1 : undefined,
        }));
        storeRunes(this.runes);
        this.transcendenceRunes = this.transcendenceRunes.map((rune) => ({ ...rune, price: 1 }));
        storeTranscendencePrices(this.transcendenceRunes);
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
        this.loadTranscendenceRunes();
    }

    exportRunesData(): void {
        const blob = new Blob([JSON.stringify(this.runes, null, 2)], { type: 'application/json' });
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
				const importedRunes = parseRunesData(JSON.parse(String(reader.result)));
				if (!importedRunes) throw new Error('Le fichier doit contenir une liste de runes valide.');

				storeRunes(importedRunes);
				this.loadRunes();
			} catch (error) {
				console.error("Erreur lors de l'import du fichier runesData JSON", error);
				void this.showImportError();
            } finally {
                input.value = '';
            }
        };
        reader.readAsText(file);
    }

	private async showImportError(): Promise<void> {
		const { default: Swal } = await import('sweetalert2/dist/sweetalert2.esm.all.js');
		await Swal.fire({
			title: 'Import impossible',
			text: 'Le fichier sélectionné ne contient pas une liste de runes valide.',
			icon: 'error',
			confirmButtonText: 'Fermer',
		});
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

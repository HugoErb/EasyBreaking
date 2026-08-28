import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { forkJoin } from 'rxjs';
import { AppSettings, readAppSettings, resetAppSettings, writeAppSettings } from './app-settings';

interface ItemWithType {
	type: string;
}

@Component({
	selector: 'app-settings',
	templateUrl: './settings.component.html',
	styleUrls: ['./settings.component.scss'],
	changeDetection: ChangeDetectionStrategy.OnPush,
	standalone: false,
})
export class SettingsComponent implements OnInit {
	settings: AppSettings = readAppSettings();
	itemTypes: string[] = [];

	constructor(
		private readonly http: HttpClient,
		private readonly cdr: ChangeDetectorRef,
	) {}

	ngOnInit(): void {
		forkJoin([
			this.http.get<ItemWithType[]>('assets/jsons/armes.json'),
			this.http.get<ItemWithType[]>('assets/jsons/equipements.json'),
		]).subscribe({
			next: ([weapons, equipment]) => {
				this.itemTypes = [...new Set([...weapons, ...equipment].map((item) => item.type))].sort((a, b) =>
					a.localeCompare(b, 'fr'),
				);
				this.settings.bestItemsDefaultFilters.selectedTypes =
					this.settings.bestItemsDefaultFilters.selectedTypes.filter((type) => this.itemTypes.includes(type));
				this.cdr.markForCheck();
			},
		});
	}

	saveSettings(): void {
		this.settings.defaultProfitabilityRate = Math.min(Math.max(this.settings.defaultProfitabilityRate ?? 25, 0), 9999);
		const filters = this.settings.bestItemsDefaultFilters;
		filters.breakRate = Math.min(Math.max(filters.breakRate ?? 100, 0), 4000);
		filters.minimumLevel = Math.min(Math.max(filters.minimumLevel ?? 1, 1), 200);
		filters.maximumLevel = Math.min(Math.max(filters.maximumLevel ?? 200, 1), 200);
		if (filters.minimumLevel > filters.maximumLevel) filters.maximumLevel = filters.minimumLevel;
		writeAppSettings(this.settings);
	}

	async confirmResetSettings(): Promise<void> {
		const { default: Swal } = await import('sweetalert2/dist/sweetalert2.esm.all.js');
		const result = await Swal.fire({
			title: 'Réinitialiser les réglages ?',
			text: 'Tous les réglages retrouveront leur valeur par défaut.',
			icon: 'warning',
			showCancelButton: true,
			confirmButtonText: 'Réinitialiser',
			cancelButtonText: 'Annuler',
			confirmButtonColor: '#d33',
		});

		if (!result.isConfirmed) return;
		this.settings = resetAppSettings();
		this.cdr.markForCheck();
	}
}

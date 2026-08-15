import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { SearchHistoryEntry, SearchHistoryService } from './search-history.service';

@Component({
	selector: 'app-search-history',
	templateUrl: './search-history.component.html',
	styleUrls: ['./search-history.component.scss'],
	standalone: false,
})
export class SearchHistoryComponent implements OnInit {
	history: SearchHistoryEntry[] = [];

	constructor(
		private readonly searchHistoryService: SearchHistoryService,
		private readonly router: Router,
	) {}

	ngOnInit(): void {
		this.history = this.searchHistoryService.getEntries();
	}

	goToHomePage(): void {
		void this.router.navigate(['']);
	}
}

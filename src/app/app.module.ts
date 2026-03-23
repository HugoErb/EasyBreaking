import { registerLocaleData } from '@angular/common';
import localeFr from '@angular/common/locales/fr';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { NgModule, LOCALE_ID } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { definePreset } from '@primeng/themes';
import Lara from '@primeng/themes/lara';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { providePrimeNG } from 'primeng/config';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { TooltipModule } from 'primeng/tooltip';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';

import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';
import { HomeComponent } from './home/home.component';
import { RunesManagerComponent } from './runes-manager/runes-manager.component';

registerLocaleData(localeFr, 'fr');

const MyPreset = definePreset(Lara, {
	semantic: {
		primary: {
			50: '#f0f7ff',
			100: '#cce3fd',
			200: '#99c7fb',
			300: '#66aaf8',
			400: '#338ef5',
			500: '#006FEE',
			600: '#005bc4',
			700: '#00439a',
			800: '#002e6f',
			900: '#001845',
			950: '#000c23',
		},
	},
});

@NgModule({
	declarations: [AppComponent, HomeComponent, RunesManagerComponent],
	bootstrap: [AppComponent],
	imports: [
		BrowserModule,
		BrowserAnimationsModule,
		FormsModule,
		AppRoutingModule,
		AutoCompleteModule,
		DialogModule,
		TooltipModule,
		InputNumberModule,
		IconFieldModule,
		InputIconModule,
	],
	providers: [
		{ provide: LOCALE_ID, useValue: 'fr' },
		provideHttpClient(withInterceptorsFromDi()),
		providePrimeNG({ theme: { preset: MyPreset, options: { darkModeSelector: false } } }),
	],
})
export class AppModule {}

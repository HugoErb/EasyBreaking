import { NgModule, LOCALE_ID } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { HomeComponent } from './home/home.component';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { TooltipModule } from 'primeng/tooltip';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { InputNumberModule } from 'primeng/inputnumber';
import { DialogModule } from 'primeng/dialog';

import { registerLocaleData } from '@angular/common';
import localeFr from '@angular/common/locales/fr';
import { RunesManagerComponent } from './runes-manager/runes-manager.component';

registerLocaleData(localeFr, 'fr');

@NgModule({
    declarations: [
        AppComponent,
        HomeComponent,
        RunesManagerComponent
    ],
    imports: [
        BrowserModule,
        BrowserAnimationsModule,
        FormsModule,
        AppRoutingModule,
        AutoCompleteModule,
        DialogModule,
        TooltipModule,
        InputNumberModule,
        HttpClientModule
    ],
    providers: [{ provide: LOCALE_ID, useValue: 'fr' }],
    bootstrap: [AppComponent]
})
export class AppModule { }

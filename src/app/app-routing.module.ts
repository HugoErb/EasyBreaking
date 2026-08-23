import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { RunesManagerComponent } from './runes-manager/runes-manager.component';
import { SearchHistoryComponent } from './search-history/search-history.component';
import { BestItemsComponent } from './best-items/best-items.component';


const routes: Routes = [
  {
    path: '',
    component: HomeComponent
  },
  {
    path: 'runes-manager',
    component: RunesManagerComponent
  },
  {
    path: 'search-history',
    component: SearchHistoryComponent
  },
  {
    path: 'best-items',
    component: BestItemsComponent
  }
];


@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }

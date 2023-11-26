import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { RunesManagerComponent } from './runes-manager/runes-manager.component';


const routes: Routes = [
  {
    path: '',
    component: HomeComponent
  },
  {
    path: 'runes-manager',
    component: RunesManagerComponent
  }
];


@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }

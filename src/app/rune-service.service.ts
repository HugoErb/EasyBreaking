import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class RuneService {
  
  constructor(private http: HttpClient) { }

  getRunes(): Observable<any> {
    return this.http.get('assets/jsons/runes.json');
  }

  // updateRunes(runes: any[]): Observable<any> {
  //   // Implémentez la logique pour envoyer les données mises à jour au serveur
  //   // Cela peut dépendre de votre backend
  // }
}


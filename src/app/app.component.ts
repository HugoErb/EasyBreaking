import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'EasyBreaking';

  constructor(private http: HttpClient) {
    this.loadRunesInLocalStorage();
  }

  loadRunesInLocalStorage() {
      const retrievedData = localStorage.getItem('runesData');
      if (retrievedData == null) {
        this.http.get<any>('assets/jsons/runes.json').subscribe(data => {
          const jsonData = JSON.stringify(data);
          localStorage.setItem('runesData', jsonData);
      });
    }
  }
}

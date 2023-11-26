import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RunesManagerComponent } from './runes-manager.component';

describe('RunesManagerComponent', () => {
  let component: RunesManagerComponent;
  let fixture: ComponentFixture<RunesManagerComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [RunesManagerComponent]
    });
    fixture = TestBed.createComponent(RunesManagerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

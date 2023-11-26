import { TestBed } from '@angular/core/testing';

import { RuneServiceService } from './rune-service.service';

describe('RuneServiceService', () => {
  let service: RuneServiceService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(RuneServiceService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

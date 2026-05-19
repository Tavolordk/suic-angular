import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SuicEmptyState } from './suic-empty-state';

describe('SuicEmptyState', () => {
  let component: SuicEmptyState;
  let fixture: ComponentFixture<SuicEmptyState>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SuicEmptyState]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SuicEmptyState);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

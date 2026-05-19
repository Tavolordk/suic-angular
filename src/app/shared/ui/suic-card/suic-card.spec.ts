import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SuicCard } from './suic-card';

describe('SuicCard', () => {
  let component: SuicCard;
  let fixture: ComponentFixture<SuicCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SuicCard]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SuicCard);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

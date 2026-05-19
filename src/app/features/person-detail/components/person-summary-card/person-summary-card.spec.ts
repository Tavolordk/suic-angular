import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PersonSummaryCard } from './person-summary-card';

describe('PersonSummaryCard', () => {
  let component: PersonSummaryCard;
  let fixture: ComponentFixture<PersonSummaryCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PersonSummaryCard]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PersonSummaryCard);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PersonResultCard } from './person-result-card';

describe('PersonResultCard', () => {
  let component: PersonResultCard;
  let fixture: ComponentFixture<PersonResultCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PersonResultCard]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PersonResultCard);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

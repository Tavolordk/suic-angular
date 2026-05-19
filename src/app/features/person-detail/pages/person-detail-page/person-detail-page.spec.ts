import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PersonDetailPage } from './person-detail-page';

describe('PersonDetailPage', () => {
  let component: PersonDetailPage;
  let fixture: ComponentFixture<PersonDetailPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PersonDetailPage]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PersonDetailPage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PersonInfoPanel } from './person-info-panel';

describe('PersonInfoPanel', () => {
  let component: PersonInfoPanel;
  let fixture: ComponentFixture<PersonInfoPanel>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PersonInfoPanel]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PersonInfoPanel);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

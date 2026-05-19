import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PersonRelationsPanel } from './person-relations-panel';

describe('PersonRelationsPanel', () => {
  let component: PersonRelationsPanel;
  let fixture: ComponentFixture<PersonRelationsPanel>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PersonRelationsPanel]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PersonRelationsPanel);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

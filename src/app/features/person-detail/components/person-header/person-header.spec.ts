import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PersonHeader } from './person-header';

describe('PersonHeader', () => {
  let component: PersonHeader;
  let fixture: ComponentFixture<PersonHeader>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PersonHeader]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PersonHeader);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

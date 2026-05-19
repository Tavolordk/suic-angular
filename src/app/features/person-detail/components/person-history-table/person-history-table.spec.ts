import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PersonHistoryTable } from './person-history-table';

describe('PersonHistoryTable', () => {
  let component: PersonHistoryTable;
  let fixture: ComponentFixture<PersonHistoryTable>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PersonHistoryTable]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PersonHistoryTable);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

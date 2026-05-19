import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SuicTable } from './suic-table';

describe('SuicTable', () => {
  let component: SuicTable;
  let fixture: ComponentFixture<SuicTable>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SuicTable]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SuicTable);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

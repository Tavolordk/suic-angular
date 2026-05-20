import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DataSelection } from './data-selection';

describe('DataSelection', () => {
  let component: DataSelection;
  let fixture: ComponentFixture<DataSelection>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DataSelection]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DataSelection);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

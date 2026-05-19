import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SuicInput } from './suic-input';

describe('SuicInput', () => {
  let component: SuicInput;
  let fixture: ComponentFixture<SuicInput>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SuicInput]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SuicInput);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

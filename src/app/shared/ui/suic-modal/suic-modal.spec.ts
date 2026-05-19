import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SuicModal } from './suic-modal';

describe('SuicModal', () => {
  let component: SuicModal;
  let fixture: ComponentFixture<SuicModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SuicModal]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SuicModal);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

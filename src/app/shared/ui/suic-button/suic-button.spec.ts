import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SuicButton } from './suic-button';

describe('SuicButton', () => {
  let component: SuicButton;
  let fixture: ComponentFixture<SuicButton>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SuicButton]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SuicButton);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

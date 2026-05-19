import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SuicBadge } from './suic-badge';

describe('SuicBadge', () => {
  let component: SuicBadge;
  let fixture: ComponentFixture<SuicBadge>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SuicBadge]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SuicBadge);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

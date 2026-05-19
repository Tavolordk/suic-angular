import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SuicLoader } from './suic-loader';

describe('SuicLoader', () => {
  let component: SuicLoader;
  let fixture: ComponentFixture<SuicLoader>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SuicLoader]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SuicLoader);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

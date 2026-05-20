import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ConsolidatedProfile } from './consolidated-profile';

describe('ConsolidatedProfile', () => {
  let component: ConsolidatedProfile;
  let fixture: ComponentFixture<ConsolidatedProfile>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConsolidatedProfile]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ConsolidatedProfile);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

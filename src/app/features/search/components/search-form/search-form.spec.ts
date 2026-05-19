import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SearchForm } from './search-form';

describe('SearchForm', () => {
  let component: SearchForm;
  let fixture: ComponentFixture<SearchForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SearchForm]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SearchForm);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

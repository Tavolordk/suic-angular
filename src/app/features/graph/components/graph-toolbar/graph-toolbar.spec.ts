import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GraphToolbar } from './graph-toolbar';

describe('GraphToolbar', () => {
  let component: GraphToolbar;
  let fixture: ComponentFixture<GraphToolbar>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GraphToolbar]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GraphToolbar);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

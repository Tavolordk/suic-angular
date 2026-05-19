import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AssociationGraph } from './association-graph';

describe('AssociationGraph', () => {
  let component: AssociationGraph;
  let fixture: ComponentFixture<AssociationGraph>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AssociationGraph]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AssociationGraph);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GraphNodeDetail } from './graph-node-detail';

describe('GraphNodeDetail', () => {
  let component: GraphNodeDetail;
  let fixture: ComponentFixture<GraphNodeDetail>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GraphNodeDetail]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GraphNodeDetail);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

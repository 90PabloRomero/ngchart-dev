import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SelectNodeComponent } from './select-node.component';

describe('SelectNodeComponent', () => {
  let component: SelectNodeComponent;
  let fixture: ComponentFixture<SelectNodeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ SelectNodeComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(SelectNodeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

import { Component, EventEmitter, OnInit, Output, ViewChild } from '@angular/core';
import { NgbDropdown } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-select-node',
  templateUrl: './select-node.component.html',
  styleUrls: ['./select-node.component.css']
})
export class SelectNodeComponent implements OnInit { 

  top: any;
  left: any;
  cardinal: any;
  @ViewChild('drop') drop: NgbDropdown;
  @Output() createNodeEvent = new EventEmitter();

  constructor() { }
  
  ngOnInit(): void {
  }

  ngAfterViewInit() {
  }

  open(x, y, cardinal) {
    this.top = y;
    this.left = x;
    this.drop.toggle();
    this.cardinal = cardinal;
  }

  createNode(type:any) {
    const data = {
      'cardinal': this.cardinal,
      'type': type,
    }
    this.createNodeEvent.emit(data);
  }
}

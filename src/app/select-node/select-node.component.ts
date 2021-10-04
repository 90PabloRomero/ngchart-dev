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

  close() {
    if(this.drop.isOpen())
      this.drop.toggle();
  }

  createNode(type:any) {
    const data = {
      'cardinal': this.cardinal,
      'type': type,
      'top': this.top,
      'left': this.left
    }
    this.createNodeEvent.emit(data);
  }
}

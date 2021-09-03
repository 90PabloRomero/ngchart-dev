import { Component, OnInit,ViewChild } from '@angular/core';
import { Output, EventEmitter } from '@angular/core';
import {ContactService } from '../contact.service';

@Component({
  selector: 'app-select-contact',
  templateUrl: './select-contact.component.html',
  styleUrls: ['./select-contact.component.css']
})
export class SelectContactComponent implements OnInit {
  @ViewChild('autocomplete2') autocomplete2;
  @Output() contactsAdded = new EventEmitter<any>();
  
  contactsResultList:any  = [];
  contactsSelected:any  = [];
  contactsSelectedHash:any ={};
  employeesPosition:any =[];
  keyword:any  = 'name'; //autocomplete not ngbootstrap
  queryPrev:any ="";
  isItemSelected:any =false;
  contactsNew:any[] = [{
    id: 1,
    name: 'a contact1'
  }, {
    id: 2,
    name: 'a contact2'
  }, {
    id: 3,
    name: 'b contact1'
  }, {
    id: 4,
    name: 'b contact2'
  }, {
    id: 5,
    name: 'c contact1'
  }, {
    id: 6,
    name: 'c contact2'
  }]
  userContacts:any[]=[];

  constructor(
                private contactService:ContactService
    ) { }

ngOnInit(): void {
  
  this.contactService.getUserContacts();
  this.contactsSelected=[]; 
  this.contactsSelectedHash={}; 

 }

  onCloseAutocomplete(e:any){
  //  e.stopPropagation();
    if(this.isItemSelected){
         this.autocomplete2.open();
         this.autocomplete2.query=this.queryPrev;
         this.onChangeSearch(this.autocomplete2.query);
       }
     this.isItemSelected=false
  }  
  selectEvent(item) {
    this.isItemSelected=true;
    if(!this.contactsSelectedHash[item.id]){
      this.contactsSelected.push(item);
    }
    this.contactsSelectedHash[item.id]=true;
  }

  deleteContactSelected(itemToRemove:any) {
    let contactsSelectedTmp=this.contactsSelected;
    this.contactsSelected=[];
    contactsSelectedTmp.forEach((item)=>{
      if(itemToRemove.id!=item.id){
        this.contactsSelectedHash[item.id]=true;
        this.contactsSelected.push(item);
      }
    })
  }
  addNewContacts() {
  	 let result=this.contactsSelected;
     this.contactsSelected=[]; 
  	 this.contactsAdded.emit(result);
}
  cancelAllContactSelect() {
    this.contactsSelected=[];
    this.contactsSelectedHash={};    
  }
  onChangeSearch(val: string) {
      this.queryPrev=val;
        this.contactsResultList= this.contactService.userContacts.filter(v => v.name.toLowerCase().indexOf(val.toLowerCase()) > -1)
  }
  onFocused(e){
    // do something when input is focused
  }


}
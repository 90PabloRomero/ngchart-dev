import { Injectable } from '@angular/core';
import {HttpClient } from '@angular/common/http';
import {Router } from '@angular/router';
import {GlobalService } from './global.service';


@Injectable({
  providedIn: 'root'
})

export class ContactService {
public userContacts: any[] = [];

constructor(    
	private http: HttpClient,
    private router:Router,
) { }

getUserContacts(){
/* 	  this.userContacts= [];
	  let userId = localStorage.getItem('userId');
	  let accessToken =  localStorage.getItem('accessToken');

	  if(!userId||!accessToken){
	     this.router.navigate(['/login']);
	  }

	return    this.http.get<any>(GlobalService.externalApiURL + '/user/getContactsForUser/'+userId, {
	        headers: {
	          'access_token': accessToken,
	          'Accept': 'application/json' 
	        }
	      })
	      .subscribe((any) => {
	          if (any&&any.length>0) {
	          		any.forEach((item)=>{
	          			this.userContacts.push({id:item.id,name:item.firstName})
	          		});
	           }
	  	});
  */
   }

}

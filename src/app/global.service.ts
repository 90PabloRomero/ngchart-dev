import { Injectable } from '@angular/core';
import {
  Router
} from '@angular/router';
import {
  HttpClient
} from '@angular/common/http';

@Injectable({
  providedIn: 'root',
})

// class for some global vars
export class GlobalService {
    //local for dev
    public static rootURL: string = "http://localhost:8087"; //server root address Ex. 

    //for production
    //public static rootURL: string = "http://34.136.4.101:8087"; //server root address Ex. 
    //public static rootURL: string = "http://8.209.67.160:8087"; //server root address Ex. 
    //public static rootURL: string = "http://localhost:8087"; //server root address Ex. 
    
    // external contacts backend url
    public static externalApiURL: string = "http://174.138.2.106:8080/smartconnectbackend"; //server root address Ex. 
    public static apiURL: string = GlobalService.rootURL +"/api";

  constructor(
    private router: Router,
    private http: HttpClient,
    
  ) {}


}
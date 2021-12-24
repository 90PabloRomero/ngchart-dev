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
    // public static rootURL: string = "http://localhost:8087"; //server root address Ex. 


    //for production
    public static rootURL: string = "http://smartchartd.smartsuitetools.com:8087"; 
    public static rootURL2: string = "https://apii.smartsuitetools.com:443"; 

    // public static rootURL3: string = "http://174.138.2.106:8080/smartconnectbackend";
    // public static rootURL: string = "http://8.209.67.160:8087"; //server root address Ex. 
    
    // external contacts backend url
    public static externalApiURL: string = "http://api.smartsuitetools.com/smartconnectbackend"; //server root address Ex. 
    public static apiURL: string = GlobalService.rootURL +"/api";
    public static externalApiURLSource: string = GlobalService.rootURL2 +"/";


  constructor(
    private router: Router,
    private http: HttpClient,
    
  ) {}
}

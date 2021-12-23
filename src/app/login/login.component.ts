import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { GlobalService } from '../global.service';


@Component({
    selector: 'app-login',
    templateUrl: './login.component.html',
    styleUrls: ['./login.component.css']
})

export class LoginComponent implements OnInit {
    username: any;
    password: any;
    url: any = GlobalService.apiURL;

    constructor(private http: HttpClient,
        private router: Router,
        private globalService: GlobalService,
    ) {}

    ngOnInit(): void {}

    login(event: any, user: any, pass: any) {
        if (event) {
            event.preventDefault();
        }
        if (!user || user == '' || pass == '' || !pass) {
            alert("can't be blank!");
            return;
        }
        const httpOptions = {
            headers: new HttpHeaders({
                'Content-Type': 'text/plain'
            })
        };

        this.http.post < any > (GlobalService.externalApiURL + '/user/loginUser/?email=' + user + '&password=' + pass, {}, httpOptions)
            .subscribe((any) => {
                    if (any) {
                        if (any) {
                            //check if api key is in response and save on local storage for later
                            if (any && any.userId) {
                                localStorage.setItem('userId', any.userId);
                                localStorage.setItem('name', any.name);
                                localStorage.setItem('accessToken', any.accessToken);

                            }
                            this.router.navigate(['/home']);
                        } else {
                            alert("Login Error !")
                        }
                    }
                },
                err => {
                    if (err.status == 500 || err.status == 401) {
                        alert("invalid user or password")
                    }
                    alert(err)
                    //console.log(err);
                    return;
                }
            );

    }





    login2(event: any, user: any, pass: any) {

        console.log(GlobalService.externalApiURLSource);
        
        if (event) {
            event.preventDefault();
        }
        if (!user || user == '' || pass == '' || !pass) {
            alert("can't be blank!");
            return;
        }
        const httpOptions = {
            headers: new HttpHeaders({
                'Content-Type': 'text/plain'
            })
        };

        this.http.post < any > (GlobalService.externalApiURLSource + 'user/loginUser?email=' + user + '&password=' + pass, {}, httpOptions)
            .subscribe((any) => {
                    if (any) {
                        if (any) {
                            //check if api key is in response and save on local storage for later
                            if (any && any.userId) {
                                localStorage.setItem('userId', any.userId);
                                localStorage.setItem('name', any.name);
                                localStorage.setItem('accessToken', any.accessToken);

                            }
                            this.router.navigate(['/home']);
                        } else {
                            alert("Login Error !")
                        }
                    }
                },
                err => {
                    if (err.status == 500 || err.status == 401) {
                        alert("invalid user or password")
                    }
                    alert(err)
                    //console.log(err);
                    return;
                }
            );

    }



}
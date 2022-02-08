import { NgModule } from '@angular/core';
import { SmartSplashScreenService } from './splash-screen.service';

@NgModule({
    providers: [
        SmartSplashScreenService
    ]
})
export class SmartSplashScreenModule
{
    /**
     * Constructor
     *
     * @param {SmartSplashScreenService} _smartSplashScreenService
     */
    constructor(
        private _smartSplashScreenService: SmartSplashScreenService
    )
    {
    }
}

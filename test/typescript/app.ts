import "core-js/client/shim-min.js";
import "reflect-metadata";
import "zone.js";

import { Component, NgModule } from "@angular/core";
import { platformBrowserDynamic } from "@angular/platform-browser-dynamic";
import { BrowserModule } from "@angular/platform-browser";

@Component({
    selector: "test-app",
    template: `
        <h1>Hello SystemJS</h1>
    `
})
export class AppComponent {

}

@NgModule({
    imports: [BrowserModule],
    declarations: [AppComponent],
    bootstrap: [AppComponent]
})
export class AppModule {

}
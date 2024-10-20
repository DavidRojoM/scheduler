import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { routes } from './app/app.routes';

import { BrowserModule } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { SchedulerComponent } from './app/pages/scheduler/scheduler.component';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { SharedModule } from './app/shared/shared.module';

@NgModule({
  declarations: [AppComponent],
  imports: [
    BrowserModule,
    SchedulerComponent,
    RouterModule.forRoot(routes),
    NgbModule,
    SharedModule,
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}

import { Routes } from '@angular/router';
import { AppComponent } from './app.component';
import { ScheduleComponent } from './pages/scheduler/components/schedule/schedule.component';
import { SchedulerComponent } from './pages/scheduler/scheduler.component';

export const routes: Routes = [
  {
    path: '',
    component: SchedulerComponent,
  },
];

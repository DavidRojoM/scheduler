import { Injectable } from '@angular/core';
import { LocalstorageService } from './localstorage.service';
import { Task } from '../../pages/scheduler/components/modals/task/task-modal.component';
import { setHours, setMinutes } from 'date-fns';
import { LogoService } from './logo.service';

@Injectable({
  providedIn: 'root',
})
export class ConfigService {
  constructor(
    private readonly localstorageService: LocalstorageService,
    private readonly logoService: LogoService
  ) {}

  setColumns(
    columns: {
      id: string;
      title: string;
    }[]
  ) {
    this.localstorageService.set({
      scope: 'columns',
      value: columns,
    });
  }

  setParticipants(participants: string[]) {
    this.localstorageService.set({
      scope: 'participants',
      value: participants,
    });
  }

  setTasks(tasks: Task[]) {
    this.localstorageService.set({
      scope: 'tasks',
      value: tasks.map((task) => {
        const startHour = `${task.start.getHours()}:${task.start.getMinutes()}`;
        const endHour = `${task.end.getHours()}:${task.end.getMinutes()}`;

        return {
          id: task.id,
          title: task.title,
          columnId: task.columnId,
          startHour,
          endHour,
          participants: task.participants,
        };
      }),
    });
  }

  setConfig(config: {
    columns: {
      id: string;
      title: string;
    }[];
    tasks: Task[];
    participants: string[];
    logo?: string | null;
  }) {
    this.localstorageService.set({
      scope: 'columns',
      value: config.columns,
    });

    this.localstorageService.set({
      scope: 'participants',
      value: config.participants,
    });

    this.localstorageService.set({
      scope: 'tasks',
      value: config.tasks.map((task) => {
        const start = new Date(task.start);
        const end = new Date(task.end);

        const startHour = `${start.getHours()}:${start.getMinutes()}`;
        const endHour = `${end.getHours()}:${end.getMinutes()}`;

        return {
          id: task.id,
          title: task.title,
          columnId: task.columnId,
          startHour,
          endHour,
          participants: task.participants,
        };
      }),
    });

    if (config.logo) {
      this.logoService.setLogo(config.logo);
    } else {
      this.logoService.removeLogo();
    }
  }

  getConfig(): {
    columns: {
      id: string;
      title: string;
    }[];
    tasks: Task[];
    participants: string[];
    logo: string | null;
  } {
    const config = this.localstorageService.findAll();

    return {
      columns: config.columns,
      participants: JSON.parse(localStorage.getItem('participants') || '[]'),
      tasks: config.tasks.map((task) => {
        const start = new Date();
        const end = new Date();

        // Workaround due to scheduler not supporting fixed days
        const [startHour, startMinute] = task.startHour.split(':').map(Number);
        const [endHour, endMinute] = task.endHour.split(':').map(Number);

        start.setHours(startHour, startMinute);
        end.setHours(endHour, endMinute);

        return {
          columnId: task.columnId,
          id: task.id,
          title: task.title,
          start,
          end,
          participants: task.participants,
        };
      }),
      logo: this.logoService.getLogo(),
    };
  }
}

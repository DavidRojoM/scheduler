import { Injectable } from '@angular/core';

interface StoredTask {
  id: string;
  title: string;
  startHour: string;
  endHour: string;
  columnId: string;
  participants: string[];
}

interface StoredColumn {
  id: string;
  title: string;
}

type SetConfig =
  | {
      scope: 'columns';
      value: StoredColumn[];
    }
  | {
      scope: 'tasks';
      value: StoredTask[];
    }
  | {
      scope: 'participants';
      value: string[];
    };

@Injectable({
  providedIn: 'root',
})
export class LocalstorageService {
  setAll(config: {
    columns: StoredColumn[];
    tasks: StoredTask[];
    participants: string[];
  }) {
    this.setColumns(config.columns);
    this.setTasks(config.tasks);
    this.setParticipants(config.participants);
  }

  set(config: SetConfig) {
    switch (config.scope) {
      case 'columns':
        this.setColumns(config.value);
        break;
      case 'tasks':
        this.setTasks(config.value);
        break;
      case 'participants':
        this.setParticipants(config.value);
        break;
    }
  }

  private setTasks(tasks: StoredTask[]) {
    localStorage.setItem('tasks', JSON.stringify(tasks));
  }

  private setParticipants(participants: string[]) {
    localStorage.setItem('participants', JSON.stringify(participants));
  }

  private setColumns(columns: StoredColumn[]) {
    localStorage.setItem('columns', JSON.stringify(columns));
  }

  findAll(): {
    columns: StoredColumn[];
    tasks: StoredTask[];
    participants: string[];
  } {
    try {
      const storedColumns = localStorage.getItem('columns');
      const storedTasks = localStorage.getItem('tasks');
      const storedParticipants = localStorage.getItem('participants');

      if (!storedColumns) {
        localStorage.setItem('columns', JSON.stringify([]));
      }

      if (!storedTasks) {
        localStorage.setItem('tasks', JSON.stringify([]));
      }

      if (!storedParticipants) {
        localStorage.setItem('participants', JSON.stringify([]));
      }

      // TODO(David): add schema validations
      return {
        columns: JSON.parse(
          localStorage.getItem('columns') || '[]'
        ) as StoredColumn[],
        tasks: JSON.parse(
          localStorage.getItem('tasks') || '[]'
        ) as StoredTask[],
        participants: JSON.parse(localStorage.getItem('participants') || '[]'),
      };
    } catch (error) {
      console.error('Error parsing data from localstorage', error);
      return {
        columns: [],
        tasks: [],
        participants: [],
      };
    }
  }
}

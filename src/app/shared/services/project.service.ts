import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { v4 } from 'uuid';
import {
  Project,
  ProjectConfig,
  DEFAULT_PROJECT_CONFIG,
} from '../models/project.model';

const PROJECTS_STORAGE_KEY = 'scheduler_projects';
const CURRENT_PROJECT_KEY = 'scheduler_current_project_id';
const MIGRATION_VERSION_KEY = 'scheduler_migration_version';
const CURRENT_MIGRATION_VERSION = 1;

@Injectable({
  providedIn: 'root',
})
export class ProjectService {
  private _projects: Project[] = [];
  private _currentProject: Project | null = null;

  private _projects$ = new BehaviorSubject<Project[]>([]);
  private _currentProject$ = new BehaviorSubject<Project | null>(null);

  get projects$(): Observable<Project[]> {
    return this._projects$.asObservable();
  }

  get currentProject$(): Observable<Project | null> {
    return this._currentProject$.asObservable();
  }

  get currentProject(): Project | null {
    return this._currentProject;
  }

  get projects(): Project[] {
    return this._projects;
  }

  constructor() {
    this.loadProjects();
  }

  private loadProjects(): void {
    const projectsJson = localStorage.getItem(PROJECTS_STORAGE_KEY);
    const currentProjectId = localStorage.getItem(CURRENT_PROJECT_KEY);
    const migrationVersion = parseInt(
      localStorage.getItem(MIGRATION_VERSION_KEY) || '0'
    );

    if (projectsJson) {
      this._projects = JSON.parse(projectsJson).map((p: any) => ({
        ...p,
        createdAt: new Date(p.createdAt),
        updatedAt: new Date(p.updatedAt),
      }));
    }

    const needsMigration = migrationVersion < CURRENT_MIGRATION_VERSION;
    const hasOldData = this.hasOldDataFormat();

    if (this._projects.length === 0) {
      const defaultProject = this.createProject('Default Project');
      this._currentProject = defaultProject;
      if (hasOldData) {
        this.migrateOldData(defaultProject.id);
      }
    } else {
      this._currentProject =
        this._projects.find((p) => p.id === currentProjectId) ||
        this._projects[0];

      if (needsMigration && hasOldData) {
        this.migrateOldData(this._currentProject.id);
      }
    }

    if (needsMigration) {
      localStorage.setItem(
        MIGRATION_VERSION_KEY,
        CURRENT_MIGRATION_VERSION.toString()
      );
    }

    this._projects$.next(this._projects);
    this._currentProject$.next(this._currentProject);
    this.saveCurrentProjectId();
  }

  private hasOldDataFormat(): boolean {
    return !!(
      localStorage.getItem('columns') ||
      localStorage.getItem('tasks') ||
      localStorage.getItem('participants')
    );
  }

  private migrateOldData(projectId: string): void {
    const oldColumns = localStorage.getItem('columns');
    const oldTasks = localStorage.getItem('tasks');
    const oldParticipants = localStorage.getItem('participants');

    let migratedCount = 0;

    if (oldColumns) {
      localStorage.setItem(`${projectId}_columns`, oldColumns);
      localStorage.removeItem('columns');
      migratedCount++;
    }
    if (oldTasks) {
      localStorage.setItem(`${projectId}_tasks`, oldTasks);
      localStorage.removeItem('tasks');
      migratedCount++;
    }
    if (oldParticipants) {
      localStorage.setItem(`${projectId}_participants`, oldParticipants);
      localStorage.removeItem('participants');
      migratedCount++;
    }

    if (migratedCount > 0) {
      console.log(
        `✅ Data migration complete: ${migratedCount} data types migrated to project ${projectId}`
      );
    }
  }

  private saveProjects(): void {
    localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(this._projects));
    this._projects$.next(this._projects);
  }

  private saveCurrentProjectId(): void {
    if (this._currentProject) {
      localStorage.setItem(CURRENT_PROJECT_KEY, this._currentProject.id);
      this._currentProject$.next(this._currentProject);
    }
  }

  createProject(name: string, config?: Partial<ProjectConfig>): Project {
    const now = new Date();
    const project: Project = {
      id: v4(),
      name,
      config: { ...DEFAULT_PROJECT_CONFIG, ...config },
      createdAt: now,
      updatedAt: now,
    };

    this._projects.push(project);
    this.saveProjects();
    return project;
  }

  updateProject(
    id: string,
    updates: Partial<Omit<Project, 'id' | 'createdAt'>>
  ): void {
    const index = this._projects.findIndex((p) => p.id === id);
    if (index !== -1) {
      this._projects[index] = {
        ...this._projects[index],
        ...updates,
        updatedAt: new Date(),
      };

      if (this._currentProject?.id === id) {
        this._currentProject = this._projects[index];
        this._currentProject$.next(this._currentProject);
      }

      this.saveProjects();
    }
  }

  deleteProject(id: string): void {
    if (this._projects.length <= 1) {
      alert('Cannot delete the last project');
      return;
    }

    this._projects = this._projects.filter((p) => p.id !== id);
    this.saveProjects();

    if (this._currentProject?.id === id) {
      this.switchProject(this._projects[0].id);
    }

    localStorage.removeItem(`${id}_columns`);
    localStorage.removeItem(`${id}_tasks`);
    localStorage.removeItem(`${id}_participants`);
  }

  switchProject(id: string): void {
    const project = this._projects.find((p) => p.id === id);
    if (project) {
      this._currentProject = project;
      this.saveCurrentProjectId();
      window.location.reload();
    }
  }

  getProjectConfig(projectId?: string): ProjectConfig {
    const project = projectId
      ? this._projects.find((p) => p.id === projectId)
      : this._currentProject;
    return project?.config || DEFAULT_PROJECT_CONFIG;
  }
}

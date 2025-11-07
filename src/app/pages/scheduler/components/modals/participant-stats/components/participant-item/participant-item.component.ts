import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormatTimePipe } from '../../../../../../../shared/pipes/format-time.pipe';
import { TaskListItemComponent, Task } from '../task-list-item/task-list-item.component';

export interface ParticipantStats {
  name: string;
  totalMinutes: number;
  tasks: Task[];
  isExpanded: boolean;
}

@Component({
  selector: 'sch-participant-item',
  standalone: true,
  imports: [CommonModule, FormatTimePipe, TaskListItemComponent],
  templateUrl: './participant-item.component.html',
  styleUrl: './participant-item.component.scss'
})
export class ParticipantItemComponent {
  @Input({ required: true }) participant!: ParticipantStats;
  @Input() id?: string;
  @Output() delete = new EventEmitter<string>();
  @Output() removeFromTask = new EventEmitter<{ participantName: string; taskId: string }>();
  @Output() toggleExpanded = new EventEmitter<void>();

  onDelete(): void {
    this.delete.emit(this.participant.name);
  }

  onRemoveFromTask(taskId: string): void {
    this.removeFromTask.emit({ participantName: this.participant.name, taskId });
  }

  onToggleExpanded(): void {
    this.toggleExpanded.emit();
  }
}

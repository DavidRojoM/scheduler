import { Component, OnInit } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { ModalHeaderComponent } from '../../../../../shared/ui/components/modals/modal-header/modal-header.component';
import { SharedModule } from '../../../../../shared/shared.module';
import { TasksService } from '../../../../../shared/services/tasks.service';
import { ParticipantsService } from '../../../../../shared/services/participants.service';
import { take } from 'rxjs';

interface ParticipantStats {
  name: string;
  totalHours: number;
  totalMinutes: number;
}

@Component({
  selector: 'sch-participant-stats-modal',
  templateUrl: './participant-stats-modal.component.html',
  styleUrl: './participant-stats-modal.component.scss',
  standalone: true,
  imports: [ModalHeaderComponent, SharedModule],
})
export class ParticipantStatsModalComponent implements OnInit {
  modalTitle = 'Participant Statistics';
  participantStats: ParticipantStats[] = [];

  constructor(
    public activeModal: NgbActiveModal,
    private tasksService: TasksService,
    private participantsService: ParticipantsService
  ) {}

  ngOnInit(): void {
    this.calculateParticipantStats();
  }

  private calculateParticipantStats(): void {
    // Get all tasks
    this.tasksService.tasks$.pipe(take(1)).subscribe((tasks) => {
      // Create a map to track hours per participant
      const hoursMap = new Map<string, number>();

      // Calculate hours for each participant
      tasks.forEach((task) => {
        const durationMs = task.end.getTime() - task.start.getTime();
        const durationHours = durationMs / (1000 * 60 * 60);

        task.participants.forEach((participant) => {
          const currentHours = hoursMap.get(participant) || 0;
          hoursMap.set(participant, currentHours + durationHours);
        });
      });

      // Convert map to array and sort by total minutes descending
      this.participantStats = Array.from(hoursMap.entries())
        .map(([name, totalHours]) => {
          const totalMinutes = Math.round(totalHours * 60);
          return {
            name,
            totalHours: Math.floor(totalHours),
            totalMinutes,
          };
        })
        .sort((a, b) => b.totalMinutes - a.totalMinutes);
    });
  }

  /**
   * Format time display as "X hours Y minutes" or just "Y minutes" if less than an hour
   */
  formatTime(hours: number, minutes: number): string {
    const remainingMinutes = minutes % 60;

    if (hours === 0) {
      return `${remainingMinutes} ${remainingMinutes === 1 ? 'minute' : 'minutes'}`;
    }

    if (remainingMinutes === 0) {
      return `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
    }

    return `${hours} ${hours === 1 ? 'hour' : 'hours'} ${remainingMinutes} ${remainingMinutes === 1 ? 'minute' : 'minutes'}`;
  }

  deleteParticipant(participantName: string): void {
    const confirmed = confirm(
      `Are you sure you want to delete "${participantName}"?\n\nThis will remove them from all tasks and cannot be undone.`
    );

    if (confirmed) {
      // Remove participant from the participants service
      this.participantsService.deleteParticipant(participantName);

      // Remove participant from all tasks
      this.tasksService.tasks$.pipe(take(1)).subscribe((tasks) => {
        tasks.forEach((task) => {
          if (task.participants.includes(participantName)) {
            const updatedTask = {
              ...task,
              participants: task.participants.filter((p) => p !== participantName),
            };
            this.tasksService.updateTask(updatedTask);
          }
        });
      });

      // Recalculate stats
      this.calculateParticipantStats();
    }
  }

  close(): void {
    this.activeModal.dismiss();
  }
}

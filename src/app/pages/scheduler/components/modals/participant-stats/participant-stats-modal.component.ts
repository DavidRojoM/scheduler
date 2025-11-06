import { Component, OnInit } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { ModalHeaderComponent } from '../../../../../shared/ui/components/modals/modal-header/modal-header.component';
import { SharedModule } from '../../../../../shared/shared.module';
import { TasksService } from '../../../../../shared/services/tasks.service';
import { ParticipantsService } from '../../../../../shared/services/participants.service';
import { take } from 'rxjs';
import { FormatTimePipe } from '../../../../../shared/pipes/format-time.pipe';

interface ParticipantStats {
  name: string;
  totalMinutes: number;
}

@Component({
  selector: 'sch-participant-stats-modal',
  templateUrl: './participant-stats-modal.component.html',
  styleUrl: './participant-stats-modal.component.scss',
  standalone: true,
  imports: [ModalHeaderComponent, SharedModule, FormatTimePipe],
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
    this.tasksService.tasks$.pipe(take(1)).subscribe((tasks) => {
      const hoursMap = new Map<string, number>();

      tasks.forEach((task) => {
        const durationMs = task.end.getTime() - task.start.getTime();
        const durationHours = durationMs / (1000 * 60 * 60);

        task.participants.forEach((participant) => {
          const currentHours = hoursMap.get(participant) || 0;
          hoursMap.set(participant, currentHours + durationHours);
        });
      });

      this.participantStats = Array.from(hoursMap.entries())
        .map(([name, totalHours]) => ({
          name,
          totalMinutes: Math.round(totalHours * 60),
        }))
        .sort((a, b) => b.totalMinutes - a.totalMinutes);
    });
  }

  deleteParticipant(participantName: string): void {
    const confirmed = confirm(
      `Are you sure you want to delete "${participantName}"?\n\nThis will remove them from all tasks and cannot be undone.`
    );

    if (confirmed) {
      this.participantsService.deleteParticipant(participantName);

      this.tasksService.tasks$.pipe(take(1)).subscribe((tasks) => {
        tasks.forEach((task) => {
          if (task.participants.includes(participantName)) {
            const updatedTask = {
              ...task,
              participants: task.participants.filter(
                (p) => p !== participantName
              ),
            };
            this.tasksService.updateTask(updatedTask);
          }
        });
      });

      this.calculateParticipantStats();
    }
  }

  close(): void {
    this.activeModal.dismiss();
  }
}

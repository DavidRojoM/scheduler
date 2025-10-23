import {
  Component,
  DestroyRef,
  ElementRef,
  OnInit,
  ViewChild,
} from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { ModalHeaderComponent } from '../../../../../shared/ui/components/modals/modal-header/modal-header.component';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { SharedModule } from '../../../../../shared/shared.module';
import { NgSelectModule } from '@ng-select/ng-select';
import {
  addMinutes,
  differenceInMinutes,
  getHours,
  getMinutes,
  isBefore,
  areIntervalsOverlapping,
} from 'date-fns';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ParticipantsService } from '../../../../../shared/services/participants.service';
import { TasksService } from '../../../../../shared/services/tasks.service';
import { SEGMENTS_BY_HOUR } from '../../../../../shared/constants/config';
export interface Task {
  id: string;
  columnId: string;
  title: string;
  start: Date;
  end: Date;
  participants: string[];
}

@Component({
  selector: 'sch-task-modal',
  templateUrl: './task-modal.component.html',
  styleUrl: './task-modal.component.scss',
  standalone: true,
  imports: [ModalHeaderComponent, SharedModule, NgSelectModule],
})
export class TaskModalComponent implements OnInit {
  @ViewChild('title', {
    static: true,
  })
  private readonly columnTitle!: ElementRef<HTMLInputElement>;

  modalTitle = 'Add Task';

  segmentsPerHour = SEGMENTS_BY_HOUR;

  modalData!:
    | {
        type: 'add';
        task: { date: Date; id: string; columnId: string };
        saveHandler: (task: Task) => void;
      }
    | {
        type: 'edit';
        task: Task;
        saveHandler: (task: Task) => void;
        deleteHandler: (taskId: string) => void;
      };

  form = new FormGroup({
    title: new FormControl<string>('', {
      validators: [Validators.required],
      nonNullable: true,
    }),
    start: new FormControl<string>('', {
      validators: [Validators.required],
      nonNullable: true,
    }),
    end: new FormControl<string>('', {
      validators: [Validators.required],
      nonNullable: true,
    }),
    participants: new FormControl<string[]>([], {
      nonNullable: true,
    }),
  });

  conflictedParticipants = new Set<string>();
  participantsWithConflictInfo: Array<{name: string, isConflicted: boolean, displayName: string}> = [];

  constructor(
    private activeModal: NgbActiveModal,
    private readonly destroyRef: DestroyRef,
    readonly participantsService: ParticipantsService,
    private readonly tasksService: TasksService
  ) {}
  ngOnInit(): void {
    this.form.controls.participants.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((participants) => {
        for (const participant of participants) {
          const participantName = typeof participant === 'string' ? participant : (participant as any).name;
          this.participantsService.createIfNotExists(participantName);
        }
        this.checkConflicts();
      });

    this.form.controls.start.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.checkConflicts();
      });

    this.form.controls.end.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.checkConflicts();
      });

    if (this.modalData.type === 'add') {
      const startDate = new Date(this.modalData.task.date);
      const endDate = addMinutes(
        new Date(this.modalData.task.date),
        60 / this.segmentsPerHour
      );

      const start = `${getHours(startDate)}:${getMinutes(startDate)}`;
      const end = `${getHours(endDate)}:${getMinutes(endDate)}`;

      this.form.patchValue({
        start,
        end,
      });
    } else if (this.modalData.type === 'edit') {
      const start = `${getHours(this.modalData.task.start)}:${getMinutes(
        this.modalData.task.start
      )}`;
      const end = `${getHours(this.modalData.task.end)}:${getMinutes(
        this.modalData.task.end
      )}`;

      this.form.patchValue({
        title: this.modalData.task.title,
        start,
        end,
        participants: this.modalData.task.participants,
      });
    }

    this.columnTitle.nativeElement.focus();

    // Initialize participants list
    this.updateParticipantsWithConflictInfo();

    // Check for conflicts on modal open
    this.checkConflicts();
  }
  closeModal() {
    this.activeModal.close();
  }

  deleteTask(taskId: string) {
    if (this.modalData.type !== 'edit') {
      return;
    }

    this.modalData.deleteHandler(taskId);
    this.activeModal.close();
  }

  save() {
    if (!this.form.valid) {
      return;
    }

    const value = this.form.getRawValue();

    const [startHour, startMinute] = value.start.split(':').map(Number);
    const [endHour, endMinute] = value.end.split(':').map(Number);

    const start = new Date();
    start.setHours(startHour, startMinute);

    const end = new Date();
    end.setHours(endHour, endMinute);

    if (isBefore(end, start)) {
      return;
    }

    if (Math.abs(differenceInMinutes(end, start)) < 60 / this.segmentsPerHour) {
      return;
    }

    this.modalData.saveHandler({
      id: this.modalData.task.id,
      title: value.title,
      columnId: this.modalData.task.columnId,
      start,
      end,
      participants: value.participants,
    });

    this.activeModal.close();
  }

  checkConflicts(): void {
    const startValue = this.form.controls.start.value;
    const endValue = this.form.controls.end.value;

    this.conflictedParticipants.clear();

    if (!startValue || !endValue) {
      return;
    }

    const [startHour, startMinute] = startValue.split(':').map(Number);
    const [endHour, endMinute] = endValue.split(':').map(Number);

    if (
      isNaN(startHour) ||
      isNaN(startMinute) ||
      isNaN(endHour) ||
      isNaN(endMinute)
    ) {
      return;
    }

    const start = new Date();
    start.setHours(startHour, startMinute, 0, 0);

    const end = new Date();
    end.setHours(endHour, endMinute, 0, 0);

    if (isBefore(end, start)) {
      return;
    }

    const currentTaskId = this.modalData.task.id;

    // Get all participants from the service to check against all of them
    const allParticipants = this.participantsService.participants;

    for (const participant of allParticipants) {
      const participantName = participant.name;
      const hasConflict = this.tasksService.tasks.some((task) => {
        // Skip the current task when editing
        if (task.id === currentTaskId) {
          return false;
        }

        // Check if this task has the participant
        if (!task.participants.includes(participantName)) {
          return false;
        }

        // Check if time intervals overlap
        return areIntervalsOverlapping(
          { start, end },
          { start: task.start, end: task.end },
          { inclusive: false }
        );
      });

      if (hasConflict) {
        this.conflictedParticipants.add(participantName);
      }
    }

    // Update participants list with conflict info
    this.updateParticipantsWithConflictInfo();
  }

  updateParticipantsWithConflictInfo(): void {
    const participants = this.participantsService.participants;
    this.participantsWithConflictInfo = participants.map(p => ({
      name: p.name,
      isConflicted: this.conflictedParticipants.has(p.name),
      displayName: this.conflictedParticipants.has(p.name) ? `⚠️ ${p.name}` : p.name
    }));
  }

  isParticipantConflicted(participant: string): boolean {
    return this.conflictedParticipants.has(participant);
  }

  getParticipantName(item: any): string {
    if (typeof item === 'string') {
      return item;
    }
    return item?.name || item;
  }
}

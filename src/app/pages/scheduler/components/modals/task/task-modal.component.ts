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
import { NgSelectComponent } from '@ng-select/ng-select';
import { addMinutes, getHours, getMinutes } from 'date-fns';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ParticipantsService } from '../../../../../shared/services/participants.service';
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
  imports: [ModalHeaderComponent, SharedModule, NgSelectComponent],
})
export class TaskModalComponent implements OnInit {
  @ViewChild('title', {
    static: true,
  })
  private readonly columnTitle!: ElementRef<HTMLInputElement>;

  modalTitle = 'Add Task';

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

  constructor(
    private activeModal: NgbActiveModal,
    private readonly destroyRef: DestroyRef,
    readonly participantsService: ParticipantsService
  ) {}
  ngOnInit(): void {
    this.form.controls.participants.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((participants) => {
        for (const participant of participants) {
          this.participantsService.createIfNotExists(participant);
        }
      });

    if (this.modalData.type === 'add') {
      const startDate = new Date(this.modalData.task.date);
      const endDate = addMinutes(new Date(this.modalData.task.date), 30);

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
}

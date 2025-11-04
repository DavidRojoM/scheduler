import {
  Component,
  ChangeDetectionStrategy,
  ViewChild,
  TemplateRef,
  input,
  DestroyRef,
  OnInit,
  ElementRef,
  AfterViewInit,
  ChangeDetectorRef,
} from '@angular/core';
import { Subject } from 'rxjs';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import {
  CalendarEvent,
  CalendarEventTimesChangedEvent,
  CalendarView,
  CalendarDateFormatter,
} from 'angular-calendar';
import { SharedModule } from '../../../../shared/shared.module';
import { TaskModalComponent } from '../modals/task/task-modal.component';
import { v4 } from 'uuid';
import { TasksService } from '../../../../shared/services/tasks.service';
import { MobileDetectionService } from '../../../../shared/services/mobile-detection.service';
import {
  TASK_COLORS,
  DAY_END_HOUR,
  DAY_START_HOUR,
  SEGMENTS_BY_HOUR,
} from '../../../../shared/constants';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CustomDateFormatter } from './date-formatter';
import { isBefore } from 'date-fns';

interface Task {
  id: string;
  columnId: string;
  title: string;
  start: Date;
  end: Date;
  participants: string[];
  draggable: boolean;
  resizable: {
    beforeStart: boolean;
    afterEnd: boolean;
  };
  color: {
    primary: string;
    secondary: string;
  };
}

@Component({
  selector: 'sch-schedule',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [
    `
      h3 {
        margin: 0 0 10px;
      }

      pre {
        background-color: #f5f5f5;
        padding: 15px;
      }
    `,
  ],
  templateUrl: './schedule.component.html',
  styleUrl: './schedule.component.scss',
  providers: [
    {
      provide: CalendarDateFormatter,
      useClass: CustomDateFormatter,
    },
  ],
  standalone: true,
  imports: [SharedModule],
})
export class ScheduleComponent implements OnInit, AfterViewInit {
  @ViewChild('modalContent', { static: true }) modalContent!: TemplateRef<any>;

  hourSegments = SEGMENTS_BY_HOUR;
  dayStartHour = DAY_START_HOUR;
  dayEndHour = DAY_END_HOUR;

  columnId = input.required<string>();

  view: CalendarView = CalendarView.Day;

  CalendarView = CalendarView;

  viewDate: Date = new Date();

  refresh = new Subject<void>();

  tasks: (CalendarEvent & Task)[] = [];

  activeDayIsOpen: boolean = true;

  // Long press state for mobile
  private longPressTimer: any;
  private touchStartX = 0;
  private touchStartY = 0;
  private readonly LONG_PRESS_DELAY = 500; // 500ms
  private readonly MOVE_THRESHOLD = 10; // 10px
  private currentTouchEventId: string | null = null;

  get isMobile(): boolean {
    return this.mobileDetectionService.isMobile;
  }

  constructor(
    private modal: NgbModal,
    private readonly tasksService: TasksService,
    private readonly destroyRef: DestroyRef,
    private readonly mobileDetectionService: MobileDetectionService,
    private readonly elementRef: ElementRef,
    private readonly cdr: ChangeDetectorRef
  ) {}
  ngOnInit(): void {
    this.tasksService.tasks$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((tasks) => {
        this.tasks = tasks
          .filter((task) => task.columnId === this.columnId())
          .map((task) => ({
            id: task.id,
            title: task.title,
            start: task.start,
            end: task.end,
            color: {
              primary: task.color.primary,
              secondary: task.color.secondary,
            },
            // Keep draggable enabled, we'll control it via CSS and event handling
            draggable: task.draggable,
            resizable: this.isMobile ? { beforeStart: false, afterEnd: false } : task.resizable,
            participants: task.participants,
            columnId: task.columnId,
          }));

        this.refresh.next();
      });
  }

  ngAfterViewInit(): void {
    if (this.isMobile) {
      this.setupLongPressDrag();
    }
  }

  private setupLongPressDrag(): void {
    const element = this.elementRef.nativeElement;

    // Use capture phase to intercept events before the calendar library
    element.addEventListener('touchstart', this.onTouchStart.bind(this), {
      passive: false,
      capture: true
    });
    element.addEventListener('touchmove', this.onTouchMove.bind(this), {
      passive: false,
      capture: true
    });
    element.addEventListener('touchend', this.onTouchEnd.bind(this), {
      passive: false,
      capture: true
    });
    element.addEventListener('touchcancel', this.onTouchCancel.bind(this), {
      passive: false,
      capture: true
    });
  }

  private onTouchStart(event: TouchEvent): void {
    const target = event.target as HTMLElement;
    const calEvent = target.closest('.cal-event');

    if (!calEvent) {
      return;
    }

    // Get the event ID from the element
    const eventId = this.getEventIdFromElement(calEvent);
    if (!eventId) {
      return;
    }

    this.touchStartX = event.touches[0].clientX;
    this.touchStartY = event.touches[0].clientY;
    this.currentTouchEventId = eventId;

    // Prevent default to stop immediate drag
    event.preventDefault();
    event.stopPropagation();

    // Add visual feedback
    calEvent.classList.add('long-press-waiting');

    // Start long press timer
    this.longPressTimer = setTimeout(() => {
      calEvent.classList.remove('long-press-waiting');
      calEvent.classList.add('long-press-active', 'drag-enabled');

      // Haptic feedback
      if ('vibrate' in navigator) {
        navigator.vibrate(50);
      }

      // Now that long press is complete, re-dispatch the touch event
      // so the calendar library can handle it
      this.triggerDragStart(calEvent as HTMLElement, event);
    }, this.LONG_PRESS_DELAY);
  }

  private onTouchMove(event: TouchEvent): void {
    if (!event.touches.length) {
      return;
    }

    const target = event.target as HTMLElement;
    const calEvent = target.closest('.cal-event');

    // If we're not touching an event, allow normal scrolling
    if (!calEvent) {
      return;
    }

    // Check if this event is drag-enabled
    if (calEvent.classList.contains('drag-enabled')) {
      // Allow the move - don't prevent default
      return;
    }

    const deltaX = Math.abs(event.touches[0].clientX - this.touchStartX);
    const deltaY = Math.abs(event.touches[0].clientY - this.touchStartY);

    // If user moved beyond threshold before long press completed
    if ((deltaX > this.MOVE_THRESHOLD || deltaY > this.MOVE_THRESHOLD) && this.longPressTimer) {
      // Cancel long press and allow scrolling
      this.cancelLongPress();
      if (calEvent) {
        calEvent.classList.remove('long-press-waiting', 'long-press-active');
      }
      this.currentTouchEventId = null;
      // Don't prevent default - allow scrolling
      return;
    }

    // If long press hasn't completed yet, prevent movement
    if (this.longPressTimer) {
      event.preventDefault();
      event.stopPropagation();
    }
  }

  private onTouchEnd(event: TouchEvent): void {
    // Clean up visual feedback
    const target = event.target as HTMLElement;
    const calEvent = target.closest('.cal-event');
    if (calEvent) {
      calEvent.classList.remove('long-press-waiting', 'long-press-active', 'drag-enabled');
    }

    // If long press wasn't completed, cancel it
    if (this.longPressTimer) {
      this.cancelLongPress();
    }

    this.currentTouchEventId = null;
  }

  private onTouchCancel(event: TouchEvent): void {
    this.cancelLongPress();

    const target = event.target as HTMLElement;
    const calEvent = target.closest('.cal-event');
    if (calEvent) {
      calEvent.classList.remove('long-press-waiting', 'long-press-active', 'drag-enabled');
    }

    this.currentTouchEventId = null;
  }

  private triggerDragStart(element: HTMLElement, originalEvent: TouchEvent): void {
    // Remove our event listeners temporarily to avoid re-capturing
    const hostElement = this.elementRef.nativeElement;

    // Remove capture listeners
    hostElement.removeEventListener('touchstart', this.onTouchStart.bind(this), true);
    hostElement.removeEventListener('touchmove', this.onTouchMove.bind(this), true);

    // Create a new touch event that the calendar can process
    const touch = originalEvent.touches[0];
    const newTouchStart = new TouchEvent('touchstart', {
      bubbles: true,
      cancelable: true,
      touches: [touch],
      targetTouches: [touch],
      changedTouches: [touch],
    });

    // Dispatch to the element so calendar library can handle it
    element.dispatchEvent(newTouchStart);

    // Re-setup listeners after a brief moment
    setTimeout(() => {
      this.setupLongPressDrag();
    }, 100);
  }

  private cancelLongPress(): void {
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
  }

  private getEventIdFromElement(element: Element): string | null {
    // Try to find the event ID from the calendar event element
    const eventElement = element.closest('.cal-event');
    if (!eventElement) {
      return null;
    }

    // The calendar library adds data attributes or we can find it from the task title
    // Let's search through our tasks to match
    const titleElement = eventElement.querySelector('.cal-event-title');
    if (titleElement) {
      const title = titleElement.textContent?.trim();
      const matchingTask = this.tasks.find(t => t.title === title);
      return matchingTask?.id as string || null;
    }

    return null;
  }

  eventTimesChanged({
    event,
    newStart,
    newEnd,
  }: CalendarEventTimesChangedEvent): void {
    const updatedTasks: Task[] = this.tasks.map((iEvent) => {
      if (iEvent.id === event.id) {
        // TODO: Refactor
        return {
          ...event,
          // @ts-ignore
          start: newStart,
          end: newEnd as Date,
          title: iEvent.title,
          columnId: this.columnId(),
          participants: iEvent.participants,
          color: TASK_COLORS.red,
          draggable: true,
          resizable: this.isMobile ? {
            afterEnd: false,
            beforeStart: false,
          } : {
            afterEnd: true,
            beforeStart: true,
          },
          id: event.id as string,
        };
      }
      return {
        id: iEvent.id as string,
        title: iEvent.title,
        start: iEvent.start,
        end: iEvent.end,
        columnId: this.columnId(),
        participants: iEvent.participants,
        color: TASK_COLORS.red,
        draggable: true,
        resizable: this.isMobile ? {
          afterEnd: false,
          beforeStart: false,
        } : {
          afterEnd: true,
          beforeStart: true,
        },
      };
    });

    for (const updatedTask of updatedTasks) {
      this.tasksService.updateTask(updatedTask);
    }

    this.refresh.next();
  }

  handleEvent(action: 'task' | 'segment', task: CalendarEvent): void {
    if (action === 'segment') {
      const modalRef = this.modal.open(TaskModalComponent, {
        size: 'lg',
        backdrop: 'static',
        scrollable: true,
        keyboard: true,
      });

      modalRef.componentInstance.modalData = {
        type: 'add',
        task: {
          ...task,
          id: v4(),
          columnId: this.columnId(),
        },
        saveHandler: (task: Task) => this.addTask(task),
      };
    } else if (action === 'task') {
      const modalRef = this.modal.open(TaskModalComponent, {
        size: 'lg',
        backdrop: 'static',
        scrollable: true,
        keyboard: true,
      });

      modalRef.componentInstance.modalTitle = task.title;

      modalRef.componentInstance.modalData = {
        type: 'edit',
        task: {
          ...task,
          columnId: this.columnId(),
        },
        saveHandler: (task: Task) => this.editEvent(task),
        deleteHandler: (taskId: string) => this.deleteTask(taskId),
      };
    }
  }

  addTask(task: Task): void {
    this.tasksService.addTask({
      id: task.id,
      title: task.title,
      columnId: task.columnId,
      end: task.end,
      start: task.start,
      participants: task.participants,
      color: TASK_COLORS.red,
      draggable: true,
      resizable: this.isMobile ? {
        afterEnd: false,
        beforeStart: false,
      } : {
        afterEnd: true,
        beforeStart: true,
      },
    });

    this.refresh.next();
  }

  editEvent(task: Task): void {
    this.tasksService.updateTask({
      id: task.id,
      title: task.title,
      columnId: task.columnId,
      end: task.end,
      start: task.start,
      participants: task.participants,
      color: TASK_COLORS.red,
      draggable: true,
      resizable: this.isMobile ? {
        afterEnd: false,
        beforeStart: false,
      } : {
        afterEnd: true,
        beforeStart: true,
      },
    });

    this.refresh.next();
  }

  deleteTask(taskId: string) {
    this.tasksService.deleteTask(taskId);

    this.refresh.next();
  }

  formatList(items: string[]): string {
    return new Intl.ListFormat().format(items);
  }
}

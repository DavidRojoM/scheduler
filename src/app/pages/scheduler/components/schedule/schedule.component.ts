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

    // Listen on the wrapper (which has pointer-events enabled)
    // Since cal-events have pointer-events: none, we need to detect touches on the wrapper
    element.addEventListener('touchstart', this.onTouchStart.bind(this), {
      passive: false,
    });
    element.addEventListener('touchmove', this.onTouchMove.bind(this), {
      passive: false,
    });
    element.addEventListener('touchend', this.onTouchEnd.bind(this), {
      passive: false,
    });
    element.addEventListener('touchcancel', this.onTouchCancel.bind(this), {
      passive: false,
    });
  }

  private onTouchStart(event: TouchEvent): void {
    // Get the element at the touch point
    const touch = event.touches[0];
    const x = touch.clientX;
    const y = touch.clientY;

    // Find the element at this position
    const elementAtPoint = document.elementFromPoint(x, y);
    if (!elementAtPoint) {
      return;
    }

    // Check if we touched a calendar event (or its child)
    const calEvent = elementAtPoint.closest('.cal-event') as HTMLElement;

    if (!calEvent) {
      return;
    }

    // Get the event ID from the element
    const eventId = this.getEventIdFromElement(calEvent);
    if (!eventId) {
      return;
    }

    this.touchStartX = x;
    this.touchStartY = y;
    this.currentTouchEventId = eventId;

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

      // Now pointer-events: auto is enabled via CSS
      // Dispatch a new touchstart to the element so calendar library can pick it up
      this.triggerDragStart(calEvent, touch);
    }, this.LONG_PRESS_DELAY);
  }

  private onTouchMove(event: TouchEvent): void {
    if (!event.touches.length || !this.currentTouchEventId) {
      return;
    }

    const touch = event.touches[0];
    const deltaX = Math.abs(touch.clientX - this.touchStartX);
    const deltaY = Math.abs(touch.clientY - this.touchStartY);

    // If user moved beyond threshold before long press completed
    if ((deltaX > this.MOVE_THRESHOLD || deltaY > this.MOVE_THRESHOLD) && this.longPressTimer) {
      // Cancel long press and allow scrolling
      this.cancelLongPress();

      const elementAtPoint = document.elementFromPoint(touch.clientX, touch.clientY);
      if (elementAtPoint) {
        const calEvent = elementAtPoint.closest('.cal-event');
        if (calEvent) {
          calEvent.classList.remove('long-press-waiting', 'long-press-active');
        }
      }

      this.currentTouchEventId = null;
    }
  }

  private onTouchEnd(event: TouchEvent): void {
    if (this.currentTouchEventId) {
      // Find and clean up the event element
      const allEvents = this.elementRef.nativeElement.querySelectorAll('.cal-event');
      allEvents.forEach((calEvent: HTMLElement) => {
        calEvent.classList.remove('long-press-waiting', 'long-press-active', 'drag-enabled');
      });
    }

    // If long press wasn't completed, cancel it
    if (this.longPressTimer) {
      this.cancelLongPress();
    }

    this.currentTouchEventId = null;
  }

  private onTouchCancel(event: TouchEvent): void {
    this.cancelLongPress();

    // Clean up all events
    const allEvents = this.elementRef.nativeElement.querySelectorAll('.cal-event');
    allEvents.forEach((calEvent: HTMLElement) => {
      calEvent.classList.remove('long-press-waiting', 'long-press-active', 'drag-enabled');
    });

    this.currentTouchEventId = null;
  }

  private triggerDragStart(element: HTMLElement, touch: Touch): void {
    // Create a synthetic touch event at the same position
    // Now that pointer-events: auto is set, the calendar library will handle it
    const touchObj = new Touch({
      identifier: touch.identifier,
      target: element,
      clientX: touch.clientX,
      clientY: touch.clientY,
      screenX: touch.screenX,
      screenY: touch.screenY,
      pageX: touch.pageX,
      pageY: touch.pageY,
      radiusX: touch.radiusX || 0,
      radiusY: touch.radiusY || 0,
      rotationAngle: touch.rotationAngle || 0,
      force: touch.force || 1,
    });

    const touchEvent = new TouchEvent('touchstart', {
      bubbles: true,
      cancelable: true,
      touches: [touchObj],
      targetTouches: [touchObj],
      changedTouches: [touchObj],
    });

    // Dispatch to the element
    element.dispatchEvent(touchEvent);
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

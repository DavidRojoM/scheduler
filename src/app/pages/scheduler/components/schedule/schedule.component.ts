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
  private touchStartTime = 0;
  private readonly LONG_PRESS_DELAY = 500; // 500ms
  private readonly MOVE_THRESHOLD = 10; // 10px
  private readonly TAP_MAX_DURATION = 500; // 500ms
  private currentTouchEventId: string | null = null;
  private currentTouchEvent: TouchEvent | null = null;
  private currentTouchElement: HTMLElement | null = null;
  private isDragEnabled = false;
  private isScrolling = false;

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
    // Always setup on mobile, but let's force it for testing
    console.log('Setting up long press, isMobile:', this.isMobile);
    this.setupLongPressDrag();
  }

  private setupLongPressDrag(): void {
    const element = this.elementRef.nativeElement;

    // Use capture phase to intercept BEFORE calendar library
    const boundOnTouchStart = this.onTouchStart.bind(this);
    const boundOnTouchMove = this.onTouchMove.bind(this);
    const boundOnTouchEnd = this.onTouchEnd.bind(this);
    const boundOnTouchCancel = this.onTouchCancel.bind(this);

    element.addEventListener('touchstart', boundOnTouchStart, {
      passive: false,
      capture: true,
    });
    element.addEventListener('touchmove', boundOnTouchMove, {
      passive: false,
      capture: true,
    });
    element.addEventListener('touchend', boundOnTouchEnd, {
      passive: false,
      capture: true,
    });
    element.addEventListener('touchcancel', boundOnTouchCancel, {
      passive: false,
      capture: true,
    });
  }

  private onTouchStart(event: TouchEvent): void {
    const target = event.target as HTMLElement;
    const calEvent = target.closest('.cal-event') as HTMLElement;

    if (!calEvent) {
      // Not touching an event, allow normal behavior
      this.isDragEnabled = false;
      return;
    }

    // If drag is already enabled (continuing a drag), allow it
    if (this.isDragEnabled && calEvent.getAttribute('data-drag-allowed') === 'true') {
      console.log('Drag already enabled, allowing touchstart');
      return;
    }

    console.log('Touch start on calendar event - tracking for long press');

    // Don't block the event - let it flow naturally so browser can handle scrolling
    // We'll selectively block the calendar library's drag in touchmove if needed

    // Get the event ID
    const eventId = this.getEventIdFromElement(calEvent);
    console.log('Event ID from element:', eventId);
    if (!eventId) {
      console.log('❌ No event ID found - exiting early');
      return;
    }
    console.log('✅ Event ID found, proceeding with long press setup');

    const touch = event.touches[0];
    this.touchStartX = touch.clientX;
    this.touchStartY = touch.clientY;
    this.touchStartTime = Date.now();
    this.currentTouchEventId = eventId;
    this.currentTouchEvent = event;
    this.currentTouchElement = calEvent;

    // Add visual feedback
    calEvent.classList.add('long-press-waiting');
    console.log('Added long-press-waiting class');

    // Start long press timer
    console.log('Starting long press timer for', this.LONG_PRESS_DELAY, 'ms');
    this.longPressTimer = setTimeout(() => {
      console.log('🎉 Long press timer completed!');
      calEvent.classList.remove('long-press-waiting');
      calEvent.classList.add('long-press-active', 'drag-enabled');

      // Haptic feedback
      if ('vibrate' in navigator) {
        navigator.vibrate(50);
        console.log('Vibrated');
      }

      // Mark that dragging is now allowed
      calEvent.setAttribute('data-drag-allowed', 'true');
      this.isDragEnabled = true;

      // Clear the timer reference since it completed
      this.longPressTimer = null;
      console.log('Timer reference cleared (completed naturally)');

      // Now re-trigger the touch event so calendar can start dragging
      console.log('Re-triggering touch event for calendar library');
      this.triggerCalendarDrag(calEvent, event);
    }, this.LONG_PRESS_DELAY);
  }

  private onTouchMove(event: TouchEvent): void {
    const target = event.target as HTMLElement;
    const calEvent = target.closest('.cal-event') as HTMLElement;

    if (!calEvent) {
      // Not on an event, allow scrolling
      return;
    }

    // If user is already scrolling, don't interfere at all
    if (this.isScrolling) {
      console.log('User is scrolling - allowing all events');
      return;
    }

    // Check if drag is allowed (long-press completed)
    if (this.isDragEnabled && calEvent.getAttribute('data-drag-allowed') === 'true') {
      // Long press completed, allow calendar library to handle drag
      console.log('Drag enabled - allowing touchmove');
      return;
    }

    if (!event.touches.length) {
      return;
    }

    const touch = event.touches[0];
    const deltaX = Math.abs(touch.clientX - this.touchStartX);
    const deltaY = Math.abs(touch.clientY - this.touchStartY);

    console.log('TouchMove - delta:', deltaX, deltaY, 'threshold:', this.MOVE_THRESHOLD, 'hasTimer:', !!this.longPressTimer);

    // If user moved beyond threshold, they're trying to scroll
    if (deltaX > this.MOVE_THRESHOLD || deltaY > this.MOVE_THRESHOLD) {
      console.log('Movement detected - user is scrolling');
      this.isScrolling = true;

      if (this.longPressTimer) {
        console.log('Cancelling long press timer');
        this.cancelLongPress();
        calEvent.classList.remove('long-press-waiting', 'long-press-active');
        this.currentTouchEventId = null;
        this.isDragEnabled = false;
      }
      // Don't prevent - allow scrolling
      console.log('Allowing scroll');
      return;
    }

    // Movement is small and we're waiting for long press
    // Block the calendar library from starting its drag
    if (this.longPressTimer) {
      console.log('Small movement - blocking calendar drag while waiting for long press');
      event.preventDefault();
      event.stopPropagation();
    }
  }

  private onTouchEnd(event: TouchEvent): void {
    const timerExists = !!this.longPressTimer;
    const touchDuration = Date.now() - this.touchStartTime;
    console.log('👆 Touch end - isDragEnabled:', this.isDragEnabled, 'hasTimer:', timerExists, 'duration:', touchDuration, 'ms');

    // If we're in the middle of waiting for long press
    if (this.longPressTimer && !this.isDragEnabled) {
      // Check if this was a tap (released before long press completed)
      if (touchDuration < this.TAP_MAX_DURATION) {
        // Calculate how much the user moved
        const lastTouch = event.changedTouches[0];
        const deltaX = Math.abs(lastTouch.clientX - this.touchStartX);
        const deltaY = Math.abs(lastTouch.clientY - this.touchStartY);

        console.log('Tap detected - duration:', touchDuration, 'ms, movement:', deltaX, deltaY);

        // If minimal movement, treat as a tap to open the editor
        if (deltaX < this.MOVE_THRESHOLD && deltaY < this.MOVE_THRESHOLD) {
          console.log('👆 Opening task editor (tap detected)');

          // Cancel the long press timer
          this.cancelLongPress();

          // Find the task and trigger the click handler
          if (this.currentTouchEventId && this.currentTouchElement) {
            const task = this.tasks.find(t => t.id === this.currentTouchEventId);
            if (task) {
              // Trigger the event click handler
              this.handleEvent('task', task);
            }
          }

          // Clean up
          this.cleanupTouchState();
          return;
        }
      }

      console.log('⏱️ Timer still running, keeping it alive');
      // Just remove visual feedback but let timer complete
      const allEvents = this.elementRef.nativeElement.querySelectorAll('.cal-event');
      allEvents.forEach((calEvent: HTMLElement) => {
        calEvent.classList.remove('long-press-waiting');
      });
      return;
    }

    // If drag is active, allow the touchend through for the calendar
    if (this.isDragEnabled) {
      console.log('Drag was active, allowing touchend for calendar');
    }

    // Clean up
    this.cleanupTouchState();
  }

  private cleanupTouchState(): void {
    // Clean up all events
    const allEvents = this.elementRef.nativeElement.querySelectorAll('.cal-event');
    allEvents.forEach((calEvent: HTMLElement) => {
      calEvent.classList.remove('long-press-waiting', 'long-press-active', 'drag-enabled');
      calEvent.removeAttribute('data-drag-allowed');
    });

    // Cancel timer if exists
    if (this.longPressTimer) {
      console.log('Cleanup: Cancelling timer');
      this.cancelLongPress();
    }

    this.currentTouchEventId = null;
    this.currentTouchEvent = null;
    this.currentTouchElement = null;
    this.isDragEnabled = false;
    this.isScrolling = false;
  }

  private onTouchCancel(event: TouchEvent): void {
    console.log('Touch cancel');
    this.cleanupTouchState();
  }

  private triggerCalendarDrag(calEvent: HTMLElement, originalEvent: TouchEvent): void {
    // We need to simulate the user starting a new touch on this element
    // The calendar library needs a fresh touchstart to begin its drag

    const touch = originalEvent.touches[0];

    // Create a new touch object
    const newTouch = new Touch({
      identifier: Date.now(),
      target: calEvent,
      clientX: touch.clientX,
      clientY: touch.clientY,
      screenX: touch.screenX,
      screenY: touch.screenY,
      pageX: touch.pageX,
      pageY: touch.pageY,
      radiusX: 2.5,
      radiusY: 2.5,
      rotationAngle: 0,
      force: 0.5,
    });

    // Dispatch the new touchstart event
    const newTouchEvent = new TouchEvent('touchstart', {
      cancelable: true,
      bubbles: true,
      touches: [newTouch],
      targetTouches: [newTouch],
      changedTouches: [newTouch],
    });

    console.log('Dispatching new touchstart to', calEvent);
    calEvent.dispatchEvent(newTouchEvent);

    // Also dispatch a small touchmove to actually start the drag
    setTimeout(() => {
      const moveTouch = new Touch({
        identifier: Date.now(),
        target: calEvent,
        clientX: touch.clientX + 1,
        clientY: touch.clientY + 1,
        screenX: touch.screenX + 1,
        screenY: touch.screenY + 1,
        pageX: touch.pageX + 1,
        pageY: touch.pageY + 1,
        radiusX: 2.5,
        radiusY: 2.5,
        rotationAngle: 0,
        force: 0.5,
      });

      const moveTouchEvent = new TouchEvent('touchmove', {
        cancelable: true,
        bubbles: true,
        touches: [moveTouch],
        targetTouches: [moveTouch],
        changedTouches: [moveTouch],
      });

      console.log('Dispatching touchmove to initiate drag');
      calEvent.dispatchEvent(moveTouchEvent);
    }, 10);
  }

  private cancelLongPress(): void {
    if (this.longPressTimer) {
      console.log('❌ Cancelling long press timer');
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
  }

  private getEventIdFromElement(element: Element): string | null {
    console.log('Getting event ID from element:', element);

    // Try to find the event ID from the calendar event element
    const eventElement = element.closest('.cal-event');
    console.log('Found cal-event element:', eventElement);
    if (!eventElement) {
      console.log('No cal-event element found');
      return null;
    }

    // Get all text content from the event (the title is rendered in a custom template)
    const textContent = eventElement.textContent?.trim();
    console.log('Event text content:', textContent);

    if (textContent) {
      console.log('Available tasks:', this.tasks.map(t => ({ id: t.id, title: t.title })));

      // Try to find a task whose title appears at the start of the text content
      // (since there might be participant names after the title)
      const matchingTask = this.tasks.find(t => textContent.startsWith(t.title));
      console.log('Matching task:', matchingTask);

      if (matchingTask) {
        console.log('✅ Found task ID:', matchingTask.id);
        return matchingTask.id as string;
      }
    }

    console.log('❌ No matching task found for text content');
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

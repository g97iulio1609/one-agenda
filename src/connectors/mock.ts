import type { CalendarProvider, MailProvider, TaskProvider } from './interfaces';
import type { Event, Task, EmailAction } from '../domain/types';
import { demoPlannerInput } from '../demo/demo-data';

export class MockCalendarProvider implements CalendarProvider {
  id = 'mock-calendar';

  name = 'Calendario Demo';

  async listEvents(): Promise<Event[]> {
    return demoPlannerInput().events;
  }

  async createEvent(event: Event): Promise<Event> {
    return event;
  }

  async proposeTimeSlots(): Promise<Event[]> {
    return [];
  }
}

export class MockMailProvider implements MailProvider {
  id = 'mock-mail';

  name = 'Inbox Demo';

  async listThreads(): Promise<EmailAction[]> {
    return demoPlannerInput().emailActions;
  }

  async sendQuickReply(): Promise<void> {
    return Promise.resolve();
  }

  async extractTasksFromThread(): Promise<Task[]> {
    return demoPlannerInput().emailActions.flatMap((email) => email.extractedTasks);
  }
}

export class MockTaskProvider implements TaskProvider {
  id = 'mock-task';

  name = 'Task Demo';

  async listTasks(): Promise<Task[]> {
    return demoPlannerInput().tasks;
  }

  async upsertTask(task: Task): Promise<Task> {
    return task;
  }

  async completeTask(): Promise<void> {
    return Promise.resolve();
  }
}

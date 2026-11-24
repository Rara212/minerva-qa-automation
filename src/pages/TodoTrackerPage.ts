import { expect } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';

export class TodoTrackerPage {
  readonly page: Page;
  readonly taskInput: Locator;
  readonly addTaskButton: Locator;
  readonly validationError: Locator;

  constructor(
    page: Page,
    private readonly path: string
  ) {
    this.page = page;
    this.taskInput = page.getByRole('textbox', { name: /task/i });
    this.addTaskButton = page.getByRole('button', { name: /add task|create task/i });
    this.validationError = page.getByRole('alert');
  }

  async goto(): Promise<void> {
    await this.page.goto(this.path);
  }

  async addTask(title: string): Promise<void> {
    await this.taskInput.fill(title);
    await this.addTaskButton.click();
  }

  async editTask(currentTitle: string, updatedTitle: string): Promise<void> {
    const task = this.taskItem(currentTitle);
    await task.getByRole('button', { name: /edit/i }).click();
    const editor = task.getByRole('textbox');
    await editor.fill(updatedTitle);
    await editor.press('Enter');
  }

  async setTaskCompleted(title: string, completed: boolean): Promise<void> {
    const checkbox = this.taskItem(title).getByRole('checkbox');
    if (completed) {
      await checkbox.check();
    } else {
      await checkbox.uncheck();
    }
  }

  async deleteTask(title: string): Promise<void> {
    await this.taskItem(title)
      .getByRole('button', { name: /delete|remove/i })
      .click();
  }

  async expectTask(title: string): Promise<void> {
    await expect(this.taskItem(title)).toBeVisible();
  }

  async expectTaskRemoved(title: string): Promise<void> {
    await expect(this.taskItem(title)).toHaveCount(0);
  }

  async expectValidationError(expectedText: string | RegExp): Promise<void> {
    await expect(this.validationError).toContainText(expectedText);
  }

  private taskItem(title: string): Locator {
    const titleText = this.page.getByText(title, { exact: true });
    return this.page.getByRole('listitem').filter({ has: titleText });
  }
}

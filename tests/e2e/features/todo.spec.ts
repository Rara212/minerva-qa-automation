import { test, expect } from '../../../src/fixtures/authFixture';
import { TodoTrackerPage } from '../../../src/pages/TodoTrackerPage';

const checklistPath = '/checklist';

test.describe('Scholarship to-do tracker (P1)', () => {
  test('TC_TODO_001 creates, edits, completes, and deletes a task', async ({
    authedPage,
  }, testInfo) => {
    const todoPage = new TodoTrackerPage(authedPage, checklistPath);
    const taskTitle = `QA task ${testInfo.workerIndex}-${Date.now()}`;
    const updatedTitle = `${taskTitle} updated`;

    await todoPage.goto();
    await todoPage.addTask(taskTitle);
    await todoPage.expectTask(taskTitle);
    await todoPage.editTask(taskTitle, updatedTitle);
    await todoPage.expectTaskRemoved(taskTitle);
    await todoPage.expectTask(updatedTitle);
    await expect(authedPage.getByText(updatedTitle, { exact: true })).toBeVisible();
    await todoPage.setTaskCompleted(updatedTitle, true);
    await todoPage.deleteTask(updatedTitle);
    await todoPage.expectTaskRemoved(updatedTitle);
  });

  test('TC_TODO_002 rejects empty and whitespace-only task titles', async ({ authedPage }) => {
    const todoPage = new TodoTrackerPage(authedPage, checklistPath);
    await todoPage.goto();

    await todoPage.addTask('');
    await todoPage.expectValidationError(/required|empty|task/i);
    await expect(todoPage.validationError).toContainText(/required|empty|task/i);
    await authedPage.reload();
    await todoPage.goto();
    await todoPage.addTask('   ');
    await todoPage.expectValidationError(/required|empty|task/i);
  });

  test('TC_TODO_003 rejects overlong and duplicate task titles', async ({
    authedPage,
  }, testInfo) => {
    const todoPage = new TodoTrackerPage(authedPage, checklistPath);
    const taskTitle = `Duplicate task ${testInfo.workerIndex}-${Date.now()}`;

    await todoPage.goto();
    await todoPage.addTask('x'.repeat(201));
    await todoPage.expectValidationError(/200|character|limit/i);
    await expect(todoPage.validationError).toContainText(/200|character|limit/i);

    await todoPage.addTask(taskTitle);
    await todoPage.expectTask(taskTitle);
    await todoPage.addTask(taskTitle);
    await todoPage.expectValidationError(/duplicate|already exists/i);
    await todoPage.deleteTask(taskTitle);
  });
});

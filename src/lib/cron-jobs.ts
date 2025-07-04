import { NotificationScheduler } from './notification-scheduler';

export async function runScheduledTasks() {
  const tasks = [
    {
      name: 'Inventory Check',
      task: NotificationScheduler.runInventoryCheck,
      schedule: 'hourly',
    },
    {
      name: 'Event Reminders',
      task: NotificationScheduler.sendEventReminders,
      schedule: 'daily',
    },
    {
      name: 'Cleanup Old Notifications',
      task: NotificationScheduler.cleanupOldNotifications,
      schedule: 'weekly',
    },
  ];

  const results = [];

  for (const { name, task } of tasks) {
    try {
      console.log(`🔄 Running ${name}...`);
      const result = await task();
      results.push({ name, ...result });
      console.log(`✅ ${name} completed`);
    } catch (error) {
      console.error(`❌ ${name} failed:`, error);
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      results.push({ name, success: false, error: errorMessage });
    }
  }

  return results;
}

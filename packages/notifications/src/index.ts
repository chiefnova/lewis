export type NotificationChannel = "email";

export type NotificationTemplate = "invite" | "account_created" | "password_reset";

export type NotificationPayload = {
  channel: NotificationChannel;
  template: NotificationTemplate;
  recipient: string;
  data: Record<string, string>;
};

export async function sendNotification(payload: NotificationPayload): Promise<void> {
  void payload;
  // Sprint 1 wires the queue contract. Provider dispatch lands behind the worker.
}

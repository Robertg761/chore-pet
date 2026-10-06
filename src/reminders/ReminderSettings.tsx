// PLACEHOLDER (Phase 7 batch H: reminders). Keep the props. Shown inside the settings screen.

export interface ReminderSettingsProps {
  petName: string
}

export function ReminderSettings({ petName }: ReminderSettingsProps) {
  return <p>Reminders from {petName} are coming soon.</p>
}

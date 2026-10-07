# Privacy

Chore Pet keeps as little about you as it can.

## What is stored

- **A guest id.** Everyone starts as a guest: a random account id, with no name or email.
- **Your email**, if you save your home with email.
- **Your Google profile** (name, email, and picture link), if you save or sign in with Google.
- **Your home**: its name, rooms and the objects in them, your pet and its look, your chores and their schedules, when you finished each chore, your rewards, and your vacation dates.

The app also keeps a copy on your device, so it works offline.

## Where it is stored

In a [Supabase](https://supabase.com) database. Supabase processes the data for us and doesn't use it for anything else. Each account can only read and change its own rows.

Like any web server, Supabase sees your IP address when the app talks to it, and keeps it in its request logs.

## What we don't do

- No analytics, tracking or ads.
- No push server: reminders are scheduled on your device and never leave it.
- Nothing is sold or shared.

## Deleting everything

In the app, open **Settings** and tap **Delete my home and account**. That removes your account and everything in it from the server straight away, and clears the copy on your device.

Without cloud sync (no account), everything stays on your device: clearing the site's data removes it.

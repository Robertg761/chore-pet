# Auth email templates

Supabase sends these through the project's custom SMTP. Paste each file's
contents into **Authentication > Emails > Templates** and set the subject.

| Supabase template | File | Subject | Sent when |
| --- | --- | --- | --- |
| Change Email Address | `change-email.html` | Keep your Chore Pet home safe | A guest taps "Save with email" in Settings |
| Magic Link | `magic-link.html` | Your Chore Pet sign-in link | Someone taps "Sign in" with email on another device |
| Confirm signup | `confirm-signup.html` | Confirm your email for Chore Pet | Not used by the app today; kept in the same style |

They use inline styles and tables so they look the same in Gmail, Apple
Mail and Outlook. The pet image is the app icon served from the live site.

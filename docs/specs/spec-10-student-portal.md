# Spec 10: Student Portal (My Account)

## Status: ✅ Completed

## Overview
A student-facing dashboard where registered users can view their enrollments, payment status, and manage their profile. Accessible via login from the main site.

## Access
- Any registered user can log in
- URL: `my-account.html`
- Link added to navbar as "My Account" (shown only when logged in)

## Features

### Authentication
- Login form (email/password)
- Google OAuth option
- Register form (name, email, phone, password)
- Password reset link
- Seamless redirect after login

### My Courses Tab
- List of enrolled courses with:
  - Course title & thumbnail/icon
  - Enrollment date
  - Payment status badge (Pending / Confirmed / Failed)
  - Course status (Active / Completed)
  - Link to course page
- Empty state: "No enrollments yet — browse our courses"

### Payment History Tab
- Table of all payment transactions:
  - Date, Course, Amount, Method, Status
- Receipt download (future)

### Profile Tab
- View/edit: Full name, Phone, Email (read-only)
- Change password
- Profile photo (future)

### Quick Actions
- "Browse Courses" button → index.html#courses
- "Contact Support" → WhatsApp link
- Logout button

## Files
- [NEW] `my-account.html`
- [NEW] `my-account.css`
- [NEW] `my-account.js`
- [MODIFY] `index.html` — add "My Account" link in navbar (conditional)

## Dependencies
- `supabase-auth.js`
- `profiles`, `enrollments`, `courses` tables

## Design
- Same dark theme as rest of site
- Responsive tabs layout
- Status badges matching admin panel style
- Animated transitions between tabs

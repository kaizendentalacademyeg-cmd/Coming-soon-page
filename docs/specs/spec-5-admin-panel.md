# Spec 5: Admin Panel

## Status: ✅ Completed

## Overview
Full admin dashboard for managing the Kaizen Dental Academy platform. Protected by Supabase auth + admin role check.

## Access Control
- Protected by Supabase authentication
- Admin role verified via `profiles.role = 'admin'`
- Non-admin users see "Access Denied" page
- Admin panel not linked from public pages

## Features

### Dashboard
- Total members count
- Active enrollments
- Revenue summary
- Recent sign-ups

### Members Management
- View all members (table with search/filter)
- View member details (profile, enrollments, payment history)
- Manually update payment status
- Add admin notes to enrollments
- Export members list (CSV)

### Course Management
- View/Add/Edit courses
- Toggle course visibility
- Reorder courses
- Change course status (active/completed/coming_soon/draft)
- Update batch info

### Payment Settings
- Payment method toggle: InstaPay ↔ Paymob
- InstaPay link configuration
- Payment history viewer
- Manual payment confirmation

### Policy Pages Editor
- CRUD for: Payment Policy, Refund Policy, Privacy Policy, Terms & Conditions
- Rich text editor
- Publish/unpublish toggle

### Site Settings
- WhatsApp number, Telegram bot, Facebook group
- Google Maps link, Social media links
- Contact email

### Security Log
- Recent auth events
- Admin actions audit trail

## Files
- [NEW] `admin.html`
- [NEW] `admin.css`
- [NEW] `admin.js`

## Dependencies
- `supabase-auth.js`

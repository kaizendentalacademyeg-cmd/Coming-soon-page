# Spec 8: Maintenance Mode

## Status: ✅ Completed

## Overview
Allow the admin to put the site in maintenance mode with a beautiful, animated page. Only the admin can bypass maintenance mode via a hidden login form.

## Features

### Maintenance Page (`maintenance.html`)
- Clean, modern design with CSS animations
- Animated dental/gear icon
- Customizable message from admin panel
- Countdown timer (optional)
- Hidden admin login form (only works for admin role)
- Social media links remain visible

### Admin Panel Toggle
- Toggle switch in admin panel → Site Settings
- Custom message input field
- Preview of maintenance page
- Toggle is stored in `site_settings` table as `maintenance_mode`

### Maintenance Check Script
- Lightweight script added to all public pages
- On page load: checks `site_settings.maintenance_mode.enabled`
- If enabled and user is NOT admin → redirect to `maintenance.html`
- Admin users bypass maintenance mode and see normal site

## Database
- `site_settings` key: `maintenance_mode`
- Value: `{ "enabled": false, "message": "We're updating our platform. Check back soon!", "custom_html": "" }`

## CSS Animations
- Floating particles background
- Pulsing gear/tooth icon
- Typing effect for message
- Smooth fade-in entrance

## Files
- [MODIFY] `site_settings` (add `maintenance_mode` default)
- [NEW] `maintenance.html`
- [MODIFY] All public pages (add maintenance check script)

## Dependencies
- `supabase-auth.js`
- `site_settings` table in Supabase

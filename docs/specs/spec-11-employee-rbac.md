# Spec 11: Employee Management & RBAC

## Status: ✅ Completed

## Overview
Adds employee account creation with role-based access control (RBAC) to the admin panel. Admins can create employee accounts, assign granular permissions, and employees see only the sections they have access to.

## Database Changes
- `profiles.role` CHECK constraint expanded: `member`, `employee`, `admin`
- New table: `permissions` — per-user permission flags (unique per user_id)
  - `can_manage_blogs`, `can_manage_courses`, `can_manage_members`, `can_manage_enrollments`, `can_manage_policies`, `can_manage_settings`, `can_view_audit_log`
- New functions: `is_staff(uid)`, `has_permission(uid, perm)`
- RLS: Admins manage all permissions. Users can read their own.

## Features

### Create Employee (Admin only)
- Form: first name, last name, email, temp password
- Permission checkboxes (7 flags)
- Creates auth user → sets role to `employee` → creates permissions row

### Team Management (Admin only)
- Lists all admins and employees with their permission tags
- Edit Permissions: toggle each permission per employee
- Remove Employee: demotes to `member`, deletes permissions row

### Permission-Based Sidebar
- Sidebar items have `data-perm` attributes
- `admin-only` items hidden from employees
- Other items shown/hidden based on `can_manage_*` flags

## Files Modified
- `admin.html` — Team sidebar item + panel HTML
- `admin.js` — verifyAdmin supports employee, loadTeam, createEmployee, editPerms, removeEmployee
- `admin.css` — Permission grid, team cards
- `my-account.js` — Employees auto-redirect to admin panel

## Dependencies
- `supabase-auth.js` (KaizenAuth)
- Supabase Auth Admin API or fallback signup

# Spec 3: Supabase Database & Auth

## Status: 🔄 In Progress

## Project
- **Project ID:** `cwkohmqprgcfyzcjcqsn`
- **URL:** `https://cwkohmqprgcfyzcjcqsn.supabase.co`
- **Region:** eu-west-1

## Database Schema

### Tables Created

#### `profiles` (extends auth.users)
| Column | Type | Notes |
|--------|------|-------|
| id | UUID (PK, FK → auth.users) | Auto-created on signup via trigger |
| first_name | TEXT | |
| last_name | TEXT | |
| email | TEXT | |
| phone | TEXT | |
| country | TEXT | |
| role | TEXT | `'member'` or `'admin'` |
| graduation_year | TEXT | For KSC special discount eligibility |

#### `courses`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID (PK) | |
| slug | TEXT UNIQUE | `'simplified-veneers'`, `'3d-bioprinting'`, `'ksc'` |
| title, subtitle, description | TEXT | |
| status | TEXT | `'active'`, `'completed'`, `'coming_soon'`, `'draft'` |
| pricing_tiers | JSONB | Array of `{name, price, currency, condition}` |
| is_visible | BOOLEAN | Toggle from admin panel |

#### `enrollments`
| Column | Type | Notes |
|--------|------|-------|
| user_id | UUID (FK → profiles) | |
| course_id | UUID (FK → courses) | |
| payment_status | TEXT | `'pending'`, `'paid'`, `'failed'`, `'refunded'` |
| payment_method | TEXT | `'paymob'`, `'instapay'`, `'manual'` |
| UNIQUE(user_id, course_id) | | One enrollment per user per course |

#### `site_settings`
Key-value store for admin-configurable settings. Current keys:
- `payment_method`, `whatsapp_number`, `telegram_bot`, `facebook_group`, `google_maps`, `social_links`, `contact_email`

#### `policies`
| Column | Type | Notes |
|--------|------|-------|
| slug | TEXT UNIQUE | `'refund-policy'`, `'payment-policy'`, `'privacy-policy'`, `'terms-and-conditions'` |
| content | TEXT | Markdown content, editable from admin |
| is_published | BOOLEAN | |

#### `admin_audit_log`
Tracks all admin actions for security auditing.

## RLS Policies
- All tables have RLS **ENABLED**
- Members can only read/update their own profile and enrollments
- Admins can CRUD everything
- Courses and settings are publicly readable
- Audit log is admin-only

## Security Fixes Applied
- Set `search_path = ''` on `handle_updated_at()` and `handle_new_user()` functions
- Fixed Supabase security advisory warnings

## Admin Account
- **Email:** `Kaizen@Dental.Academy`
- **Password:** `KaizenDental##2025##`
- **Role:** admin

## Auth Config
- Email/password signup with email verification
- Google OAuth enabled
- Redirect URL: `https://cwkohmqprgcfyzcjcqsn.supabase.co/auth/v1/callback`

## Pending
- [x] Create `supabase-auth.js` client module ✅

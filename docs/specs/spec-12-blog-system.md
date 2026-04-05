# Spec 12: Blog System

## Status: ✅ Completed

## Overview
Full blog system with admin management and public-facing pages. Supports rich content including images, YouTube embeds, and Facebook video embeds.

## Database
- New table: `blog_posts` with fields: slug, title, excerpt, content (HTML), cover_image_url, category, tags[], author_id, status (draft/published/archived), published_at, views_count, is_featured
- RLS: Anyone reads published posts. Staff with `can_manage_blogs` can CRUD.
- Supabase Storage bucket: `blog-images` (public, 5MB limit)

## Admin Panel

### Blog Management Panel
- Blog post list with cards (thumbnail, title, date, status badge, views)
- Click to edit any post
- "New Post" button to create

### Blog Editor
- Title, category, tags, excerpt, cover image (upload to Supabase Storage or paste URL)
- Rich text editor (WYSIWYG contenteditable)
  - Toolbar: Bold, Italic, Underline, H2, H3, P, Lists
  - Insert Image (URL or upload)
  - Embed YouTube (auto-detect video ID)
  - Embed Facebook Video (SDK iframe)
  - Insert Link
- Status selector: Draft / Published / Archived
- Auto-slug generation from title

## Public Pages

### blog.html — Blog Listing
- Hero section with gradient and title
- Category filter pills (All, Dental Tips, Academy News, Course Updates, Research, General)
- Responsive card grid with hover animations
- Cards show: cover image, category badge, title, excerpt, author, date
- Featured badge for featured posts

### blog-post.html — Single Post
- Cover image hero with gradient overlay
- Category, title, author, date, views
- Full HTML content rendering (images, videos, text)
- Share buttons: WhatsApp, Facebook, Copy link
- Related posts section (same category)
- View counter (auto-increments)

## Files
- [NEW] `blog.html` — listing page
- [NEW] `blog-post.html` — single post viewer
- [NEW] `blog.css` — blog-specific styles
- [NEW] `blog.js` — listing + post logic
- [MODIFY] `admin.html` — Blog sidebar + panel
- [MODIFY] `admin.js` — Blog CRUD logic
- [MODIFY] `admin.css` — Blog editor styles
- [MODIFY] `index.html` — Added "Blog" to main navbar

## Categories
- General
- Dental Tips
- Academy News
- Course Updates
- Research

## Dependencies
- `supabase-auth.js` (SUPABASE_URL, SUPABASE_ANON_KEY)
- `styles.css` (navbar styles reused on blog pages)

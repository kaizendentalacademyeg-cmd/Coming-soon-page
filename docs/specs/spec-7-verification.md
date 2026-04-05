# Spec 7: End-to-End Verification

## Status: ⬜ Not Started

## Overview
Comprehensive testing and verification plan for all platform features.

## Auth Flow Tests
- [ ] Sign up with email + password → verify email → login → logout
- [ ] Sign in with Google OAuth
- [ ] Admin login with Kaizen@Dental.Academy
- [ ] Session persistence across page reloads
- [ ] Token refresh before expiry

## RLS Security Tests
- [ ] Non-admin cannot access other users' profiles
- [ ] Non-admin cannot update enrollment payment status
- [ ] Non-admin cannot modify site_settings
- [ ] Non-admin cannot access admin_audit_log
- [ ] Unauthenticated user can read visible courses
- [ ] Unauthenticated user can read published policies

## Admin Panel Tests
- [ ] Admin can view all members
- [ ] Admin can update payment status
- [ ] Admin can CRUD courses
- [ ] Admin can toggle payment method
- [ ] Admin can edit policy pages
- [ ] Admin actions logged in audit trail

## KSC Page Tests
- [ ] Page loads correctly on desktop/tablet/mobile
- [ ] All faculty images load
- [ ] Curriculum table is readable
- [ ] Pricing tiers display correctly
- [ ] PDF download works
- [ ] WhatsApp button links correctly
- [ ] Bilingual content (EN/AR) switches properly

## Performance Audit
- [ ] Lighthouse score > 90 (Performance)
- [ ] All images lazy-loaded where appropriate
- [ ] No unnecessary JavaScript blocking render
- [ ] Font loading optimized

## Browser Compatibility
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Mobile Safari (iOS)
- [ ] Chrome Android

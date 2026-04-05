# Spec 4: Kaizen Study Club (KSC) Course Page

## Status: 🔄 In Progress

## Overview
Build a comprehensive course page for the Kaizen Study Club — a 3-month online program with 12 weekly meetings taught by 5 expert faculty members. The page follows the same design language as existing course pages (`course-3d-bioprinting.html`) but adds auth-powered enrollment via Supabase.

## Page Sections

### 1. Hero Section
- Course badge: "New Program" (red gradient)
- Title: "Kaizen Study Club"
- Subtitle: "Join 400+ Dentists in the ultimate dental education community"
- Stats: 12 Weekly Meetings | 5 Expert Faculty | 3 Months Duration
- CTA: "Join Now" + "View Curriculum"
- Faculty avatar strip (5 lecturers)

### 2. About Section
- Program overview
- Format: Online (Zoom/Teams)
- Duration: 3 months, 12 weekly meetings
- Start date: June 6, 2026
- Key features: Interactive sessions, peer learning, expert guidance

### 3. Faculty Section
- 5 lecturer cards with photos:
  - Dr. Mohamed Hadida (`ksc/hadida.png`)
  - Dr. Ahmed Elgammal (`ksc/elgammal.png`)
  - Dr. Ahmed Moheb (`ksc/moheb.png`)
  - Dr. Ahmed Talaat (`ksc/talaat.png`)
  - Dr. Youssef Hedya (`ksc/yh.png`)

### 4. Curriculum Section
12-week breakdown table:
| Week | Topic | Lecturer |
|------|-------|----------|
| 1 | Diagnosis, Photography & Treatment Planning | Dr. Mohamed Hadida |
| 2 | Diagnosis, Photography & Treatment Planning | Dr. Mohamed Hadida |
| 3 | Cariology & Pulp Capping | Dr. Ahmed Elgammal |
| 4 | Minimal Intervention & Posterior Bonded Restoration | Dr. Ahmed Elgammal |
| 5 | Direct Anterior Bonded Restorations | Dr. Ahmed Moheb |
| 6 | Direct Posterior Bonded Restorations | Dr. Ahmed Moheb |
| 7 | Preparation | Dr. Ahmed Talaat |
| 8 | Cementation & Bonding of Indirect Restorations | Dr. Ahmed Talaat |
| 9 | Dental Photography & Communication with Lab | Dr. Youssef Hedya |
| 10 | Digital Workflow (Lectures 1 & 2) | Dr. Youssef Hedya |
| 11 | Digital Workflow (Lectures 3 & 4) | Dr. Youssef Hedya |
| 12 | Revision & Discussion | All Faculty |

### 5. Pricing Section
3 tiers:
- **Early Bird**: 5,000 EGP — "Register before program starts"
- **Late Owl**: 6,000 EGP — "Register after program starts"
- **Special Discount**: 3,000 EGP — "For 2024 & 2025 graduates"

### 6. Certificates
- Attendance Certificate
- Topic-specific certificates per module

### 7. Refund Policy
Inline refund policy section from brochure data:
- Before program starts: Full refund
- After 1st meeting: 70% refund
- After 2nd meeting: 50% refund
- After 3rd meeting: No refund

### 8. Auth Modal (Future Integration)
- Sign Up / Sign In forms with email+password
- Google OAuth button
- Connected to `supabase-auth.js`
- Shows member dashboard when logged in

### 9. Footer
Consistent with other course pages.

### 10. Floating Elements
- PDF download button (for KSC Details.pdf)
- WhatsApp chat button

## Assets
- Lecturer images: `ksc/hadida.png`, `ksc/elgammal.png`, `ksc/moheb.png`, `ksc/talaat.png`, `ksc/yh.png`
- PDF file: `KSC Details.pdf`

## Files
- [NEW] `course-ksc.html`

## Dependencies
- `styles.css` (global styles)
- `course-styles.css` (course-specific styles)
- `course-script.js` (course interactivity)
- `supabase-auth.js` (auth module — future integration)

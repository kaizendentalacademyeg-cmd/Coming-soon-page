# Spec 9: File Reorganization

## Status: ⬜ Not Started (Execute Last)

## Overview
The project root is cluttered with loose files that don't belong at the top level. This spec reorganizes the file structure for maintainability without breaking any live references.

> **Important:** This spec should be executed LAST, after all features are built, to avoid breaking references mid-development.

## Current Issues
- Multiple Google Apps Script files (`.js`) in root that are deployment artifacts, not part of the website
- Loose PDF files mixed with HTML pages
- Documentation/troubleshooting `.md` files at root level
- Large lecturer images (3-5 MB each) at root instead of in a dedicated folder
- Test files at root

## Proposed Structure
```
Coming-soon-page/
├── index.html
├── course-simplified-veneers.html
├── course-3d-bioprinting.html
├── course-ksc.html
├── admin.html
├── maintenance.html
├── policy.html
├── payment-callback.html
├── styles.css
├── course-styles.css
├── script.js
├── course-script.js
├── supabase-auth.js
├── admin.css
├── admin.js
├── logo.png
├── Logo Icon.png
├── mesh.png
├── vercel.json
├── README.md
│
├── assets/
│   ├── pdfs/
│   │   ├── KSC Details.pdf
│   │   ├── 3D Bonded Bioprinting - KDA.pdf
│   │   ├── 3D Bonded Bioprinting 2nd Batch - KDA.pdf
│   │   └── SIMPLIFIED VENEERS - Dr Mohamed Hadida KDA.pdf
│   ├── images/
│   │   ├── faculty/
│   │   │   ├── Dr Hadida.png
│   │   │   ├── Elgammal.png
│   │   │   ├── Moheb.png
│   │   │   └── Youssef.png
│   │   └── courses/
│   │       └── 3D Bonded Logo.png
│   └── fonts/  (move Fonts/ → assets/fonts/)
│
├── ksc/  (keep as-is, already organized)
│
├── api/
│   ├── create-payment.js
│   └── payment-webhook.js
│
├── docs/
│   ├── specs/
│   ├── OPTIMIZE-IMAGES.md
│   ├── DEPLOYMENT_INSTRUCTIONS.md
│   ├── SPLIT_UPLOAD_ARCHITECTURE.md
│   └── TROUBLESHOOTING-GOOGLE-APPS-SCRIPT.md
│
├── scripts/  (archive, not deployed)
│   ├── APPS_SCRIPT_TEXT_ONLY.js
│   ├── CORRECTED_APPS_SCRIPT_CODE.js
│   ├── DIAGNOSTIC_APPS_SCRIPT.js
│   ├── FINAL_APPS_SCRIPT_CODE.js
│   ├── FINAL_WORKING_APPS_SCRIPT.js
│   ├── FIXED_APPS_SCRIPT_FINAL.js
│   ├── ULTIMATE_FIX_APPS_SCRIPT.js
│   └── remove-arabic.js
│
└── test/
    └── test-form-submission.html
```

## Steps
1. Create `assets/pdfs/`, `assets/images/faculty/`, `assets/images/courses/`, `scripts/`, `test/` directories
2. Move files to their new locations
3. Update all HTML references (href, src attributes) to use new paths
4. Update `vercel.json` if needed
5. Test all pages to ensure nothing is broken

## Reference Updates Required
After moving files, update references in:
- `index.html` — faculty images, PDF links
- `course-simplified-veneers.html` — PDF download link
- `course-3d-bioprinting.html` — PDF download link, faculty images, course logo
- `course-ksc.html` — PDF download link
- `course-script.js` — if any file refs exist

## Dependencies
- All other specs must be completed first
- Full test pass (Spec 7) after reorganization

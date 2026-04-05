# Spec 1: Performance Optimization

## Status: ✅ Complete

## Summary
Removed performance-heavy features across all pages to eliminate lag and improve UX.

## Changes Made

### script.js
| Change | Reason |
|--------|--------|
| Removed cursor trail effect (lines 314-324) | Per-frame mouse tracking with zero visual benefit |
| Cached `.gradient-orb` elements outside scroll handler | Eliminated repeated `querySelectorAll` inside scroll |
| Removed body opacity flash (lines 384-390) | Setting `opacity: 0` on load caused blank screen flash |
| Removed Konami code listener (lines 449-473) | Unnecessary `keydown` listener + injected style element |
| Replaced `querySelectorAll('*')` with targeted selectors | `*` selector is extremely expensive on DOM-heavy pages |

### course-script.js
| Change | Reason |
|--------|--------|
| Fixed 3D model infinite `requestAnimationFrame` loop | Now uses IntersectionObserver — only animates when visible |
| Removed duplicate progress bar (lines 772-791) | Both `script.js` and `course-script.js` created one |
| Reduced hero particles from 20 → 8, desktop only | Mobile devices don't need particle effects |

## Files Modified
- `script.js`
- `course-script.js`

## How to Revert
Each change is marked with a comment like `// REMOVED for performance`. To restore any feature, search for these comments and uncomment/re-add the original code from git history.

# 🔧 Troubleshooting Google Apps Script Integration

## Current Issue
The enrollment form on the course landing page is not successfully submitting data to the Google Apps Script.

---

## ✅ Step 1: Verify Google Apps Script Deployment

### 1.1 Check Deployment Settings
1. Open your Google Apps Script: [https://script.google.com/](https://script.google.com/)
2. Open the script for the enrollment form
3. Click **"Deploy"** → **"Manage deployments"**
4. Verify the deployment settings:
   - ✅ **Type**: Web app
   - ✅ **Execute as**: Your account (or the owner)
   - ✅ **Who has access**: **Anyone** (or "Anyone, even anonymous")
   
   ⚠️ **CRITICAL**: The access must be set to **"Anyone"** for the form to work!

### 1.2 Redeploy After Any Changes
If you made any changes to your Apps Script code:
1. Click **"Deploy"** → **"New deployment"**
2. Or click **"Deploy"** → **"Manage deployments"** → ⚙️ (gear icon) → **"Edit"**
3. Update the version or description
4. Click **"Deploy"**
5. **Copy the new Web app URL** and update it in `course-script.js` if it changed

### 1.3 Test Direct Access
Try visiting the Web App URL directly in your browser:
```
https://script.google.com/macros/s/AKfycbwHmI1StXqnyprHcgWQyu1dCD3Rt2e2ij3qJKHqu4q2aDu-2xyHzQshf9bCRJDiWy9tTQ/exec
```

- If you get an error like "Script function not found: doGet", that's expected (we're using POST)
- If you get an authentication error, check your deployment permissions

---

## ✅ Step 2: Use the Test Page

1. Open `test-form-submission.html` in your browser
2. Select a small image file (< 1MB) for testing
3. Click "Submit Test Form"
4. Review the detailed logs

### What to Look For:
- ✅ **Status 200**: Good! The request reached the server
- ❌ **Status 302/301**: Redirect - possible deployment issue
- ❌ **Status 403**: Permission denied - check deployment access
- ❌ **Status 500**: Server error - check Apps Script logs
- ❌ **CORS error**: Check CORS headers in Apps Script

---

## ✅ Step 3: Check Google Apps Script Logs

1. In your Google Apps Script editor
2. Click **"Executions"** (⏱️ icon on the left sidebar)
3. Look for recent executions when you submitted the form
4. Click on any failed execution to see error details

### Common Errors:
- **"Exception: Cannot call SpreadsheetApp.openById"**: Sheet ID is wrong or no permission
- **"Exception: Cannot call DriveApp.getFolderById"**: Folder ID is wrong or no permission
- **"ReferenceError: e is not defined"**: The request didn't arrive properly

---

## ✅ Step 4: Verify Sheet and Drive Permissions

### 4.1 Google Sheet
1. Open the Sheet: [https://docs.google.com/spreadsheets/d/1jiaJbHg_g8yu-t-WqsTZmQDIEd9Zhkt4R8RjHzNVVMI/edit](https://docs.google.com/spreadsheets/d/1jiaJbHg_g8yu-t-WqsTZmQDIEd9Zhkt4R8RjHzNVVMI/edit)
2. Verify you have edit access
3. Verify the tab name is **"Sheet1"** (case-sensitive!)

### 4.2 Google Drive Folder
1. Open the Folder: [https://drive.google.com/drive/folders/1BScjKEacDNLu2aJddnxWjO4D28uChwHw](https://drive.google.com/drive/folders/1BScjKEacDNLu2aJddnxWjO4D28uChwHw)
2. Verify you have edit access

### 4.3 Script Permissions
1. In Apps Script, click **"Executions"** → ⚙️ **"Settings"**
2. Scroll to **"Google APIs"**
3. Ensure these services are enabled:
   - Google Sheets API
   - Google Drive API
   - Gmail API

---

## ✅ Step 5: Test in Browser Console

1. Open the course landing page: `course-3d-bioprinting.html`
2. Open Developer Tools (F12)
3. Go to the **Console** tab
4. Fill out the form and submit
5. Look for these logs:
   ```
   Submitting enrollment form...
   FormData entries:
   firstName: [value]
   lastName: [value]
   ...
   Sending to: [URL]
   Response status: [number]
   Response text: [JSON or HTML]
   ```

### What the Logs Tell You:

#### ✅ If you see: `Response status: 200` and valid JSON
- The connection is working!
- Check if `data.success` is true or false
- If false, check the error message

#### ❌ If you see: `Failed to parse JSON` with HTML response
- Google Apps Script returned HTML instead of JSON
- This usually means an error or redirect occurred
- Check the Apps Script executions log

#### ❌ If you see: `CORS error` or `Failed to fetch`
- The script isn't deployed properly
- Or the URL is wrong
- Or there's a network issue

---

## ✅ Step 6: Common Fixes

### Fix 1: Redeploy as New Deployment
Sometimes Google Apps Script caches old versions:
1. Go to **Deploy** → **Manage deployments**
2. Archive all old deployments
3. Create a **new deployment**
4. Update the URL in `course-script.js` line 42

### Fix 2: Check File Size Limits
- Google Apps Script has a 50MB payload limit
- Keep uploaded images under 10MB
- Consider compressing images before upload

### Fix 3: Simplify for Testing
Temporarily modify your Apps Script to test without file upload:
```javascript
// Comment out file upload temporarily
// if (e && e.files && e.files.transaction) { ... }

// Just test basic form submission
log('Received email: ' + email);
```

### Fix 4: Test with Postman/Thunder Client
Use an API testing tool to send a POST request directly to your Web App URL with form data. This isolates whether the issue is in the JavaScript or the Apps Script.

---

## ✅ Step 7: Alternative Approach (If All Else Fails)

If the direct FormData approach continues to fail, we can try:
1. **Base64 encoding** the file in JavaScript and sending it as JSON
2. Using **XMLHttpRequest** instead of fetch
3. Breaking the submission into two steps: data first, then file upload

---

## 📞 Need More Help?

If you've tried all these steps and it's still not working, please provide:
1. Screenshot of the browser console when submitting
2. Screenshot of Google Apps Script "Executions" log
3. Confirmation of deployment settings (especially "Who has access")
4. Any error messages you see

---

## 🔗 Useful Links

- [Google Apps Script Web Apps Documentation](https://developers.google.com/apps-script/guides/web)
- [Handling File Uploads in Apps Script](https://developers.google.com/apps-script/guides/html/communication#forms)
- [Apps Script Quotas and Limitations](https://developers.google.com/apps-script/guides/services/quotas)



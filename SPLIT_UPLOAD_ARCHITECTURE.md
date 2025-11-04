# 📤 Split Upload Architecture

## Overview

The enrollment form now uses a **split architecture**:
- **Text fields** → Google Apps Script (saves to Google Sheet + sends email)
- **File upload** → Make.com webhook (handles file separately)

## Architecture

```
┌─────────────────┐
│  Enrollment Form │
└────────┬─────────┘
         │
         ├─────────────────┬─────────────────┐
         │                 │                 │
         ▼                 ▼                 ▼
    ┌─────────┐      ┌──────────┐      ┌──────────┐
    │  Text   │      │   File   │      │  File   │
    │ Fields  │      │ (FormData)│     │ (FormData)│
    └────┬────┘      └────┬─────┘      └────┬─────┘
         │                │                 │
         ▼                ▼                 ▼
┌─────────────────┐  ┌──────────────────────────┐
│ Google Apps     │  │  Make.com Webhook        │
│ Script          │  │  https://hook.us2...     │
│                 │  │                          │
│ • Save to Sheet │  │ • Receives file upload   │
│ • Send Email    │  │ • Process in Make.com    │
└─────────────────┘  └──────────────────────────┘
```

## Files Modified

### 1. `course-script.js`
- **Step 1**: Sends text fields to Apps Script (FormData, no file)
- **Step 2**: Sends file separately to Make.com webhook (FormData with file only)
- Both requests execute in parallel using `Promise.all()`

### 2. `APPS_SCRIPT_TEXT_ONLY.js`
- Updated Apps Script that **only** processes text fields
- No file handling code
- Saves to Google Sheet
- Sends confirmation email
- File link column shows: "File uploaded via Make.com webhook"

### 3. HTML (No changes needed)
- Input already has correct attributes:
  ```html
  <input id="transactionScreenshot" name="transaction" type="file" accept="image/*"/>
  ```

## Deployment Steps

### 1. Update Google Apps Script
1. Copy all code from `APPS_SCRIPT_TEXT_ONLY.js`
2. Paste into Google Apps Script editor
3. Save
4. Deploy → Manage deployments → Edit → New version → Deploy
5. Copy the new Web App URL

### 2. Update JavaScript
1. Open `course-script.js`
2. Update `GOOGLE_SCRIPT_URL` with the new Apps Script URL
3. The Make.com webhook URL is already set:
   ```javascript
   const MAKE_WEBHOOK_URL = 'https://hook.us2.make.com/ia5oq9it3owna0ngc434crv4sgdhg7d0';
   ```

### 3. Test
1. Fill out the enrollment form
2. Upload a transaction screenshot
3. Submit the form
4. Check:
   - ✅ Google Sheet has new row (text fields only)
   - ✅ Email received (from Apps Script)
   - ✅ Make.com webhook receives file (check Make.com scenario)

## Request Details

### Apps Script Request (Text Fields)
```javascript
POST https://script.google.com/.../exec
Content-Type: multipart/form-data

FormData:
  firstName: "John"
  lastName: "Doe"
  email: "john@example.com"
  phone: "1234567890"
  country: "Egypt"
  clinic: "Test Clinic"
  faculty: "Dentistry"
  gradYear: "2020"
  moreInfo: "Additional info"
  // NO FILE
```

### Make.com Webhook Request (File Only)
```javascript
POST https://hook.us2.make.com/ia5oq9it3owna0ngc434crv4sgdhg7d0
Content-Type: multipart/form-data

FormData:
  transaction: [File object]
  // NO TEXT FIELDS
```

## Benefits

1. ✅ **Separation of concerns**: Text and file handled separately
2. ✅ **Better error handling**: If one fails, the other can still succeed
3. ✅ **Flexibility**: Make.com can process file independently (AI, storage, etc.)
4. ✅ **No CORS issues**: Make.com webhooks support CORS natively
5. ✅ **Scalability**: Each endpoint can be optimized independently

## Console Logs

When form is submitted, you'll see:
```
📤 Step 1: Sending text fields to Apps Script...
Text fields to Apps Script:
  firstName: John
  lastName: Doe
  ...
📤 Step 2: Sending file to Make.com webhook...
File to upload: screenshot.jpg (123456 bytes)
⏳ Waiting for both requests to complete...
✅ Both requests sent successfully!
📊 Text data → Apps Script (Google Sheet + Email)
📁 File → Make.com webhook
```



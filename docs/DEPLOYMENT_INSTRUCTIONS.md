# 🚀 CRITICAL: Google Apps Script Deployment Settings

## ⚠️ File Uploads WILL NOT WORK if these settings are wrong!

### Step 1: Deploy the Script
1. Copy ALL code from `ULTIMATE_FIX_APPS_SCRIPT.js`
2. Paste into Google Apps Script editor
3. **Save** (Ctrl+S or Cmd+S)

### Step 2: Deployment Settings (CRITICAL!)
1. Click **Deploy** → **Manage deployments**
2. Click **Edit** (pencil icon) on your deployment
3. Click **New version** button
4. **CRITICAL SETTINGS:**
   - **Execute as:** Must be `Me (your-email@gmail.com)`
   - **Who has access:** Must be `Anyone` (not "Only myself")
5. Click **Deploy**
6. Copy the NEW Web App URL

### Step 3: Update the URL
1. Update `GOOGLE_SCRIPT_URL` in `course-script.js` with the NEW URL
2. Make sure it matches exactly (no trailing slash)

### Step 4: Test
1. Submit the form from the website
2. Check Apps Script → **Executions** (NOT "Run" button)
3. Click the latest execution
4. Look for:
   - `e.files: EXISTS`
   - `✅✅✅ FILE UPLOADED VIA METHOD 1! ✅✅✅`

### Why "Who has access" must be "Anyone"
- Google Apps Script Web Apps with restricted access strip file uploads
- Only "Anyone" allows full multipart/form-data including files
- This is a Google limitation, not our code



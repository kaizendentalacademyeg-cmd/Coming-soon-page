function doPost(e) {
  try {
    Logger.log('=== NEW REQUEST (TEXT FIELDS ONLY) ===');
    
    // IMPORTANT: Check if e exists first
    if (!e) {
      Logger.log('❌ ERROR: e is undefined!');
      return jsonResponse({ success: false, error: 'Invalid request format' });
    }
    
    // ===== CONFIGURATION =====
    const SHEET_ID = '1jiaJbHg_g8yu-t-WqsTZmQDIEd9Zhkt4R8RjHzNVVMI';
    const SHEET_NAME = 'Sheet1';
    const ACADEMY_NAME = 'Kaizen Dental Academy';
    const TIMEZONE = 'Africa/Cairo';
    const LOGO_URL = 'https://i.imgur.com/TYcFUn5.png';
    
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
    
    // ===== PARSE FORM DATA (TEXT FIELDS ONLY) =====
    const params = e.parameter || {};
    
    Logger.log('=== FORM DATA ===');
    Logger.log('Parameters received: ' + Object.keys(params).join(', '));
    
    const firstName = (params.firstName || '').trim();
    const lastName = (params.lastName || '').trim();
    const email = (params.email || '').trim();
    const phone = (params.phone || '').trim();
    const country = (params.country || '').trim();
    const clinic = (params.clinic || '').trim();
    const faculty = (params.faculty || '').trim();
    const gradYear = (params.gradYear || '').trim();
    const moreInfo = (params.moreInfo || '').trim();
    
    if (!email) {
      return jsonResponse({ success: false, error: 'Email is required' });
    }
    
    // Note: File is now handled by Make.com webhook, not here
    Logger.log('⚠️ File uploads are disabled - file is sent to Make.com webhook');
    const fileLink = 'File uploaded via Make.com webhook';
    
    // ===== SAVE TO SHEET =====
    const ts = Utilities.formatDate(new Date(), TIMEZONE, 'yyyy-MM-dd HH:mm:ss');
    
    // Check if a row with this email exists in the last 60 seconds (to match with Make.com data)
    const dataRange = sheet.getDataRange();
    const values = dataRange.getValues();
    const emailColumnIndex = 3; // Email is in column D (index 3, 0-based)
    
    let existingRowIndex = -1;
    const currentTime = new Date().getTime();
    const sixtySecondsAgo = currentTime - (60 * 1000);
    
    // Search from bottom to top (most recent first)
    for (let i = values.length - 1; i >= 1; i--) { // Skip header row (index 0)
      const rowEmail = values[i][emailColumnIndex] ? values[i][emailColumnIndex].toString().trim().toLowerCase() : '';
      const rowTimestamp = values[i][0] ? values[i][0].toString() : '';
      
      // Check if email matches and timestamp is recent (within last 60 seconds)
      if (rowEmail === email.toLowerCase()) {
        try {
          // Try to parse timestamp and check if it's recent
          const rowDate = new Date(rowTimestamp);
          if (rowDate.getTime() > sixtySecondsAgo) {
            existingRowIndex = i + 1; // +1 because sheet rows are 1-indexed
            Logger.log('✅ Found existing row ' + existingRowIndex + ' with matching email');
            break;
          }
        } catch (e) {
          // If timestamp parsing fails, just check email match
          // This handles the case where Make.com might have created the row first
          existingRowIndex = i + 1;
          Logger.log('✅ Found existing row ' + existingRowIndex + ' with matching email (timestamp check skipped)');
          break;
        }
      }
    }
    
    // Prepare row data
    const rowData = [
      ts, firstName, lastName, email, phone, country,
      clinic, faculty, gradYear, moreInfo, fileLink
    ];
    
    if (existingRowIndex > 0) {
      // Update existing row
      Logger.log('📝 Updating existing row ' + existingRowIndex);
      sheet.getRange(existingRowIndex, 1, 1, rowData.length).setValues([rowData]);
      Logger.log('✅ Data updated in existing row');
    } else {
      // Create new row
      Logger.log('➕ Creating new row');
      sheet.appendRow(rowData);
      Logger.log('✅ Data saved to new row');
    }
    
    // ===== SEND EMAIL =====
    const fullName = (firstName + ' ' + lastName).trim() || 'Participant';
    
    MailApp.sendEmail({
      to: email,
      subject: `✅ Enrollment Received — ${ACADEMY_NAME}`,
      htmlBody: `
        <div style="font-family:Segoe UI,Roboto,Arial,sans-serif;background:#f7f7f7;padding:40px 0;">
          <div style="max-width:640px;margin:auto;background:#fff;border-radius:14px;box-shadow:0 6px 24px rgba(0,0,0,.08);overflow:hidden;">
            <div style="background:linear-gradient(135deg,#111,#E6A039);padding:28px 24px;text-align:center;">
              <img src="${LOGO_URL}" alt="Logo" style="height:58px;margin-bottom:8px;">
              <h2 style="color:#fff;margin:0;font-weight:600;letter-spacing:.3px;">${ACADEMY_NAME}</h2>
            </div>
            <div style="padding:28px;color:#222;line-height:1.75;">
              <p style="font-size:16px;margin-top:0;">Dear <b>${fullName}</b>,</p>
              <p style="font-size:15px;margin:0 0 12px;">
                Thank you for completing your enrollment request for the <b>3D Bonded Bioprinting Course</b>.<br>
                We have received your details and payment screenshot.
              </p>
              <p style="font-size:15px;margin:0 0 16px;color:#E6A039;font-weight:600;">
                ✅ Our team will review your payment and contact you shortly with course details and confirmation.
              </p>
              <div style="background:#fafafa;border:1px solid #eee;border-radius:10px;padding:14px 16px;margin:18px 0;">
                <div style="font-size:14px;color:#444;">
                  <div style="margin-bottom:8px;"><b>Name:</b> ${fullName}</div>
                  <div style="margin-bottom:8px;"><b>Email:</b> ${email}</div>
                  <div style="margin-bottom:8px;"><b>Phone:</b> ${phone || '-'}</div>
                  <div style="margin-bottom:8px;"><b>Country:</b> ${country || '-'}</div>
                  <div style="margin-bottom:8px;"><b>Clinic:</b> ${clinic || '-'}</div>
                  <div style="margin-bottom:8px;"><b>Faculty:</b> ${faculty || '-'}</div>
                  <div style="margin-bottom:8px;"><b>Graduation Year:</b> ${gradYear || '-'}</div>
                  <div style="margin-bottom:8px;"><b>Transaction File:</b> Uploaded via Make.com</div>
                </div>
              </div>
              <p style="font-size:13px;color:#777;margin:0;">
                Submitted: ${ts} (Cairo Time)
              </p>
              <p style="margin:22px 0 0;font-size:15px;">
                Best regards,<br>
                <b style="color:#E6A039">${ACADEMY_NAME} Team</b>
              </p>
            </div>
            <div style="background:#f1f1f1;text-align:center;padding:14px 10px;font-size:12px;color:#777;">
              <div>© ${new Date().getFullYear()} ${ACADEMY_NAME}</div>
              <div style="margin-top:4px;">If you didn't make this request, please ignore this email.</div>
            </div>
          </div>
        </div>
      `,
      name: ACADEMY_NAME
    });
    
    Logger.log('✅ Email sent');
    
    return jsonResponse({ success: true, message: 'Enrollment saved (text fields only)' });
    
  } catch (err) {
    Logger.log('❌ FATAL ERROR: ' + err.toString());
    Logger.log('Stack: ' + (err.stack || 'No stack'));
    return jsonResponse({ success: false, error: err.toString() });
  }
}

function doOptions(e) {
  return ContentService.createTextOutput('');
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}



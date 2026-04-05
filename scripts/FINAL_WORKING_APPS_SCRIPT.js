function doPost(e) {
  try {
    Logger.log('=== NEW REQUEST ===');
    
    // IMPORTANT: Check if e exists first
    if (!e) {
      Logger.log('❌ ERROR: e is undefined! This means the request format is wrong.');
      return jsonResponse({ success: false, error: 'Invalid request format' });
    }
    
    Logger.log('e exists: YES');
    Logger.log('e.type: ' + (e.type || 'N/A'));
    
    // ===== CONFIGURATION =====
    const SHEET_ID = '1jiaJbHg_g8yu-t-WqsTZmQDIEd9Zhkt4R8RjHzNVVMI';
    const SHEET_NAME = 'Sheet1';
    const FOLDER_ID = '1BScjKEacDNLu2aJddnxWjO4D28uChwHw';
    const ACADEMY_NAME = 'Kaizen Dental Academy';
    const TIMEZONE = 'Africa/Cairo';
    const LOGO_URL = 'https://i.imgur.com/TYcFUn5.png';
    
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
    const folder = DriveApp.getFolderById(FOLDER_ID);
    
    // ===== PARSE FORM DATA =====
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
    
    // ===== FILE UPLOAD =====
    let fileLink = '';
    const timestamp = Utilities.formatDate(new Date(), TIMEZONE, 'yyyy-MM-dd_HH-mm-ss');
    const safeName = (firstName + '_' + lastName).replace(/[^\w\-]+/g, '_');
    
    Logger.log('=== FILE UPLOAD CHECK ===');
    Logger.log('e.files exists: ' + (e.files ? 'YES' : 'NO'));
    
    if (e.files) {
      Logger.log('e.files type: ' + typeof e.files);
      Logger.log('e.files keys: ' + Object.keys(e.files).join(', '));
      Logger.log('e.files.transaction exists: ' + (e.files.transaction ? 'YES' : 'NO'));
    }
    
    // METHOD 1: e.files.transaction (CORRECT for FormData)
    if (e.files && e.files.transaction) {
      Logger.log('✅ Found e.files.transaction - attempting upload...');
      try {
        const fileBlob = e.files.transaction;
        
        if (fileBlob && typeof fileBlob.getBytes === 'function') {
          const bytes = fileBlob.getBytes();
          const contentType = fileBlob.getContentType() || 'image/jpeg';
          
          Logger.log('File size: ' + bytes.length + ' bytes');
          Logger.log('Content type: ' + contentType);
          
          let ext = '.jpg';
          if (contentType.includes('png')) ext = '.png';
          else if (contentType.includes('jpeg') || contentType.includes('jpg')) ext = '.jpg';
          else if (contentType.includes('pdf')) ext = '.pdf';
          else if (contentType.includes('webp')) ext = '.webp';
          
          const fileName = 'Transaction_' + safeName + '_' + timestamp + ext;
          Logger.log('Creating file: ' + fileName);
          
          const namedBlob = Utilities.newBlob(bytes, contentType, fileName);
          const driveFile = folder.createFile(namedBlob);
          driveFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
          fileLink = 'https://drive.google.com/file/d/' + driveFile.getId() + '/view';
          
          Logger.log('✅✅✅ FILE UPLOADED TO DRIVE! ✅✅✅');
          Logger.log('File ID: ' + driveFile.getId());
          Logger.log('File link: ' + fileLink);
        } else {
          Logger.log('❌ fileBlob is not a valid Blob');
          fileLink = 'Error: File is not a Blob';
        }
      } catch (err) {
        Logger.log('❌ File upload error: ' + err.toString());
        Logger.log('Stack: ' + (err.stack || 'No stack'));
        fileLink = 'Error: ' + err.toString();
      }
    } else {
      Logger.log('❌ e.files.transaction NOT FOUND');
      Logger.log('e.files: ' + (e.files ? 'exists' : 'undefined'));
      if (e.files) {
        Logger.log('Available keys in e.files: ' + Object.keys(e.files).join(', '));
      }
      fileLink = 'No file uploaded - e.files.transaction not found';
    }
    
    // ===== SAVE TO SHEET =====
    const ts = Utilities.formatDate(new Date(), TIMEZONE, 'yyyy-MM-dd HH:mm:ss');
    
    sheet.appendRow([
      ts, firstName, lastName, email, phone, country,
      clinic, faculty, gradYear, moreInfo, fileLink
    ]);
    
    Logger.log('✅ Data saved to sheet');
    Logger.log('File link in sheet: ' + fileLink);
    
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
                  ${fileLink && fileLink.startsWith('https://') ? `<div style="margin-bottom:8px;"><b>Transaction File:</b> <a href="${fileLink}" target="_blank">View Screenshot</a></div>` : ''}
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
    
    return jsonResponse({ success: true, message: 'Enrollment saved', fileLink });
    
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



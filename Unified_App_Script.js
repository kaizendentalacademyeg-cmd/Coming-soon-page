function doPost(e) {
  try {
    Logger.log('=== NEW REQUEST RECEIVED ===');
    
    // ===== CONFIGURATION =====
    const SHEET_ID = '1jiaJbHg_g8yu-t-WqsTZmQDIEd9Zhkt4R8RjHzNVVMI';
    const SHEET_NAME = 'Sheet1';
    const FOLDER_ID = '1BScjKEacDNLu2aJddnxWjO4D28uChwHw';
    const ACADEMY_NAME = 'Kaizen Dental Academy';
    const ADMIN_EMAIL = 'info@kaizendentalacademy.com'; // Admin email for notifications
    const TIMEZONE = 'Africa/Cairo';
    const LOGO_URL = 'https://i.imgur.com/TYcFUn5.png';
    
    // Check for valid request event
    if (!e) {
      Logger.log('❌ ERROR: Request event "e" is undefined.');
      return jsonResponse({ success: false, error: 'Invalid request' });
    }
    
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
    const folder = DriveApp.getFolderById(FOLDER_ID);
    
    // ===== PARSE ALL POSSIBLE FORM DATA =====
    const params = e.parameter || {};
    Logger.log('Received parameters: ' + Object.keys(params).join(', '));
    
    const firstName = (params.firstName || '').trim();
    const lastName = (params.lastName || '').trim();
    const email = (params.email || '').trim();
    const phone = (params.phone || '').trim();
    const country = (params.country || params.countryText || '').trim();
    
    // Enrollment-specific fields
    const clinic = (params.clinic || '').trim();
    const faculty = (params.faculty || '').trim();
    const gradYear = (params.gradYear || '').trim();
    const moreInfo = (params.moreInfo || '').trim();
    
    // Contact-specific fields
    const interest = (params.interest || params.interestText || '').trim();
    const message = (params.message || '').trim();
    
    if (!email) {
      return jsonResponse({ success: false, error: 'Email is required' });
    }
    
    // ===== DETERMINE SUBMISSION TYPE =====
    const isContactForm = !!(interest || message);
    const submissionType = isContactForm ? 'Contact' : 'Enrollment';
    Logger.log('Submission type identified as: ' + submissionType);

    // ===== HANDLE FILE UPLOAD (for Enrollment form) =====
    let fileLink = '';
    if (!isContactForm) {
        const timestamp = Utilities.formatDate(new Date(), TIMEZONE, 'yyyy-MM-dd_HH-mm-ss');
        const safeName = (firstName + '_' + lastName).replace(/[^\w\-]+/g, '_');
        
        if (e.files && e.files.transaction) {
            try {
                const fileBlob = e.files.transaction;
                const bytes = fileBlob.getBytes();
                const contentType = fileBlob.getContentType() || 'application/octet-stream';
                let ext = '.dat';
                if (contentType.includes('png')) ext = '.png';
                else if (contentType.includes('jpeg') || contentType.includes('jpg')) ext = '.jpg';
                else if (contentType.includes('pdf')) ext = '.pdf';
                else if (contentType.includes('webp')) ext = '.webp';

                const fileName = `Transaction_${safeName}_${timestamp}${ext}`;
                const driveFile = folder.createFile(Utilities.newBlob(bytes, contentType, fileName));
                driveFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
                fileLink = 'https://drive.google.com/file/d/' + driveFile.getId() + '/view';
                Logger.log('✅ File uploaded successfully: ' + fileLink);
            } catch (err) {
                Logger.log('❌ File upload error: ' + err.toString());
                fileLink = 'File Upload Error';
            }
        } else {
            Logger.log('⚠️ No file found for enrollment.');
            fileLink = 'No file uploaded';
        }
    }
    
    // ===== SAVE DATA TO GOOGLE SHEET =====
    const ts = Utilities.formatDate(new Date(), TIMEZONE, 'yyyy-MM-dd HH:mm:ss');
    // Ensure you have these headers in your Google Sheet
    sheet.appendRow([
      ts,           // Timestamp
      submissionType,
      firstName,
      lastName,
      email,
      phone,
      country,
      clinic,       // Enrollment-only
      faculty,      // Enrollment-only
      gradYear,     // Enrollment-only
      moreInfo,     // Enrollment-only
      interest,     // Contact-only
      message,      // Contact-only
      fileLink      // Enrollment-only
    ]);
    Logger.log('✅ Data saved to Google Sheet.');
    
    // ===== SEND CONFIRMATION EMAIL =====
    const fullName = (firstName + ' ' + lastName).trim() || 'Guest';
    if (isContactForm) {
        // Send contact form confirmation
        MailApp.sendEmail({
            to: email,
            subject: `Thank you for contacting ${ACADEMY_NAME}`,
            htmlBody: createContactEmailHtml(fullName, email, phone, country, interest, message, ts),
            name: ACADEMY_NAME,
            replyTo: ADMIN_EMAIL
        });
        // Notify admin
        MailApp.sendEmail({
            to: ADMIN_EMAIL,
            subject: `New Contact Inquiry: ${fullName}`,
            htmlBody: `You have received a new contact form submission. Details:<br><br>
                       <b>Name:</b> ${fullName}<br>
                       <b>Email:</b> ${email}<br>
                       <b>Phone:</b> ${phone}<br>
                       <b>Country:</b> ${country}<br>
                       <b>Interest:</b> ${interest}<br>
                       <b>Message:</b> ${message}<br>
                       <b>Timestamp:</b> ${ts}`,
            name: "System Notification"
        });

    } else {
        // Send enrollment confirmation
        MailApp.sendEmail({
            to: email,
            subject: `✅ Enrollment Received — ${ACADEMY_NAME}`,
            htmlBody: createEnrollmentEmailHtml(fullName, email, phone, country, clinic, faculty, gradYear, fileLink, ts),
            name: ACADEMY_NAME
        });
    }
    Logger.log('✅ Confirmation email sent to ' + email);
    
    return jsonResponse({ success: true, message: 'Data saved successfully.' });
    
  } catch (err) {
    Logger.log('❌ FATAL ERROR: ' + err.toString());
    Logger.log('Stack: ' + (err.stack || 'No stack'));
    return jsonResponse({ success: false, error: err.toString() });
  }
}

function doOptions(e) {
  // Required for CORS preflight requests
  return ContentService.createTextOutput('');
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}


// ===== HTML EMAIL TEMPLATES =====

function createEnrollmentEmailHtml(fullName, email, phone, country, clinic, faculty, gradYear, fileLink, ts) {
    const LOGO_URL = 'https://i.imgur.com/TYcFUn5.png';
    const ACADEMY_NAME = 'Kaizen Dental Academy';
    return `
    <div style="font-family:Segoe UI,Roboto,Arial,sans-serif;background:#f7f7f7;padding:40px 0;">
      <div style="max-width:640px;margin:auto;background:#fff;border-radius:14px;box-shadow:0 6px 24px rgba(0,0,0,.08);overflow:hidden;">
        <div style="background:linear-gradient(135deg,#111,#E6A039);padding:28px 24px;text-align:center;">
          <img src="${LOGO_URL}" alt="Logo" style="height:58px;margin-bottom:8px;">
          <h2 style="color:#fff;margin:0;font-weight:600;letter-spacing:.3px;">${ACADEMY_NAME}</h2>
        </div>
        <div style="padding:28px;color:#222;line-height:1.75;">
          <p style="font-size:16px;margin-top:0;">Dear <b>${fullName}</b>,</p>
          <p style="font-size:15px;margin:0 0 12px;">
            Thank you for completing your enrollment request.<br>
            We have received your details${fileLink.startsWith('https://') ? ' and payment screenshot' : ''}.
          </p>
          <p style="font-size:15px;margin:0 0 16px;color:#E6A039;font-weight:600;">
            ✅ Our team will review and contact you shortly.
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
              ${fileLink.startsWith('https://') ? `<div style="margin-bottom:8px;"><b>Transaction File:</b> <a href="${fileLink}" target="_blank">View Screenshot</a></div>` : ''}
            </div>
          </div>
          <p style="font-size:13px;color:#777;margin:0;">Submitted: ${ts}</p>
          <p style="margin:22px 0 0;font-size:15px;">
            Best regards,<br>
            <b style="color:#E6A039">${ACADEMY_NAME} Team</b>
          </p>
        </div>
      </div>
    </div>
  `;
}

function createContactEmailHtml(fullName, email, phone, country, interest, message, ts) {
    const LOGO_URL = 'https://i.imgur.com/TYcFUn5.png';
    const ACADEMY_NAME = 'Kaizen Dental Academy';
    return `
    <div style="font-family:Segoe UI,Roboto,Arial,sans-serif;background:#f7f7f7;padding:40px 0;">
      <div style="max-width:640px;margin:auto;background:#fff;border-radius:14px;box-shadow:0 6px 24px rgba(0,0,0,.08);overflow:hidden;">
        <div style="background:linear-gradient(135deg,#111,#E6A039);padding:28px 24px;text-align:center;">
          <img src="${LOGO_URL}" alt="Logo" style="height:58px;margin-bottom:8px;">
          <h2 style="color:#fff;margin:0;font-weight:600;letter-spacing:.3px;">${ACADEMY_NAME}</h2>
        </div>
        <div style="padding:28px;color:#222;line-height:1.75;">
          <p style="font-size:16px;margin-top:0;">Dear <b>${fullName}</b>,</p>
          <p style="font-size:15px;margin:0 0 12px;">
            Thank you for reaching out to us. We have received your message and will get back to you as soon as possible.
          </p>
          <p style="font-size:15px;margin:0 0 16px;color:#E6A039;font-weight:600;">
            We appreciate your interest in ${ACADEMY_NAME}.
          </p>
          <div style="background:#fafafa;border:1px solid #eee;border-radius:10px;padding:14px 16px;margin:18px 0;">
            <div style="font-size:14px;color:#444;">
              <h4 style="margin-top:0; color:#333;">Your Inquiry Summary:</h4>
              <div style="margin-bottom:8px;"><b>Name:</b> ${fullName}</div>
              <div style="margin-bottom:8px;"><b>Email:</b> ${email}</div>
              <div style="margin-bottom:8px;"><b>Phone:</b> ${phone || '-'}</div>
              <div style="margin-bottom:8px;"><b>Country:</b> ${country || '-'}</div>
              <div style="margin-bottom:8px;"><b>Area of Interest:</b> ${interest || '-'}</div>
              <div style="margin-bottom:8px;"><b>Message:</b><br><p style="margin:0; padding-left: 8px; border-left: 2px solid #ddd;">${message || '-'}</p></div>
            </div>
          </div>
          <p style="font-size:13px;color:#777;margin:0;">Submitted: ${ts}</p>
          <p style="margin:22px 0 0;font-size:15px;">
            Best regards,<br>
            <b style="color:#E6A039">${ACADEMY_NAME} Team</b>
          </p>
        </div>
      </div>
    </div>
  `;
}

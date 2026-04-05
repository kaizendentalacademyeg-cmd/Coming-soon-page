function doPost(e) {
  try {
    Logger.log('=== NEW REQUEST ===');
    Logger.log('e exists: ' + (e ? 'YES' : 'NO'));
    
    if (!e) {
      Logger.log('❌ e is undefined!');
      return jsonResponse({ success: false, error: 'Invalid request' });
    }
    
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
    
    Logger.log('=== FORM PARAMETERS ===');
    Logger.log('Keys: ' + Object.keys(params).join(', '));
    
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
      return jsonResponse({ success: false, error: 'Email required' });
    }
    
    // ===== FILE UPLOAD - COMPREHENSIVE CHECK =====
    let fileLink = '';
    const timestamp = Utilities.formatDate(new Date(), TIMEZONE, 'yyyy-MM-dd_HH-mm-ss');
    const safeName = (firstName + '_' + lastName).replace(/[^\w\-]+/g, '_');
    
    Logger.log('=== FILE UPLOAD DETECTION ===');
    Logger.log('e.files: ' + (e.files ? 'EXISTS' : 'UNDEFINED'));
    Logger.log('e.parameter.transaction: ' + (params.transaction ? 'EXISTS' : 'UNDEFINED'));
    
    // METHOD 1: e.files.transaction (standard for FormData)
    if (e.files && e.files.transaction) {
      Logger.log('✅ METHOD 1: Found e.files.transaction');
      try {
        const blob = e.files.transaction;
        if (typeof blob.getBytes === 'function') {
          const bytes = blob.getBytes();
          const contentType = blob.getContentType() || 'image/jpeg';
          const ext = contentType.includes('png') ? '.png' : 
                     contentType.includes('pdf') ? '.pdf' : 
                     contentType.includes('webp') ? '.webp' : '.jpg';
          
          const fileName = 'Transaction_' + safeName + '_' + timestamp + ext;
          const driveFile = folder.createFile(Utilities.newBlob(bytes, contentType, fileName));
          driveFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
          fileLink = 'https://drive.google.com/file/d/' + driveFile.getId() + '/view';
          
          Logger.log('✅✅✅ FILE UPLOADED VIA METHOD 1! ✅✅✅');
          Logger.log('File: ' + fileName);
          Logger.log('Link: ' + fileLink);
        }
      } catch (err) {
        Logger.log('❌ METHOD 1 ERROR: ' + err);
      }
    }
    
    // METHOD 2: e.parameter.transaction (fallback)
    if (!fileLink && params.transaction && typeof params.transaction.getBytes === 'function') {
      Logger.log('✅ METHOD 2: Found params.transaction');
      try {
        const blob = params.transaction;
        const bytes = blob.getBytes();
        const contentType = blob.getContentType() || 'image/jpeg';
        const ext = contentType.includes('png') ? '.png' : 
                   contentType.includes('pdf') ? '.pdf' : '.jpg';
        
        const fileName = 'Transaction_' + safeName + '_' + timestamp + ext;
        const driveFile = folder.createFile(Utilities.newBlob(bytes, contentType, fileName));
        driveFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        fileLink = 'https://drive.google.com/file/d/' + driveFile.getId() + '/view';
        
        Logger.log('✅✅✅ FILE UPLOADED VIA METHOD 2! ✅✅✅');
      } catch (err) {
        Logger.log('❌ METHOD 2 ERROR: ' + err);
      }
    }
    
    // METHOD 3: Check if file is in postData as multipart
    if (!fileLink && e.postData && e.postData.type && e.postData.type.includes('multipart')) {
      Logger.log('✅ METHOD 3: Checking postData for multipart');
      try {
        const boundary = e.postData.type.split('boundary=')[1];
        const parts = e.postData.contents.split('--' + boundary);
        
        for (let part of parts) {
          if (part.includes('name="transaction"')) {
            Logger.log('Found transaction in multipart!');
            const start = part.indexOf('\r\n\r\n') + 4;
            const end = part.lastIndexOf('\r\n--');
            const content = part.substring(start, end);
            const contentType = part.includes('Content-Type:') ? 
              part.match(/Content-Type:\s*([^\r\n]+)/)[1] : 'image/jpeg';
            
            const ext = contentType.includes('png') ? '.png' : 
                       contentType.includes('pdf') ? '.pdf' : '.jpg';
            const fileName = 'Transaction_' + safeName + '_' + timestamp + ext;
            const bytes = Utilities.newBlob(content).getBytes();
            
            const driveFile = folder.createFile(Utilities.newBlob(bytes, contentType, fileName));
            driveFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
            fileLink = 'https://drive.google.com/file/d/' + driveFile.getId() + '/view';
            
            Logger.log('✅✅✅ FILE UPLOADED VIA METHOD 3! ✅✅✅');
            break;
          }
        }
      } catch (err) {
        Logger.log('❌ METHOD 3 ERROR: ' + err);
      }
    }
    
    if (!fileLink) {
      Logger.log('⚠️⚠️⚠️ NO FILE FOUND IN ANY METHOD ⚠️⚠️⚠️');
      Logger.log('e.files keys: ' + (e.files ? Object.keys(e.files).join(', ') : 'N/A'));
      Logger.log('params keys: ' + Object.keys(params).join(', '));
      fileLink = 'No file uploaded';
    }
    
    // ===== SAVE TO SHEET =====
    const ts = Utilities.formatDate(new Date(), TIMEZONE, 'yyyy-MM-dd HH:mm:ss');
    sheet.appendRow([
      ts, firstName, lastName, email, phone, country,
      clinic, faculty, gradYear, moreInfo, fileLink
    ]);
    
    Logger.log('✅ Saved to sheet, fileLink: ' + fileLink);
    
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
      `,
      name: ACADEMY_NAME
    });
    
    Logger.log('✅ Email sent');
    
    return jsonResponse({ success: true, message: 'Saved', fileLink });
    
  } catch (err) {
    Logger.log('❌ FATAL ERROR: ' + err);
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



function doPost(e) {
  try {
    Logger.log('=== NEW REQUEST ===');
    Logger.log('Request type: ' + (e.postData ? e.postData.type : 'unknown'));
    Logger.log('Has e.parameter: ' + (e.parameter ? 'YES' : 'NO'));
    Logger.log('Has e.postData: ' + (e.postData ? 'YES' : 'NO'));
    
    // ===== CONFIGURATION =====
    const SHEET_ID = '1jiaJbHg_g8yu-t-WqsTZmQDIEd9Zhkt4R8RjHzNVVMI';
    const SHEET_NAME = 'Sheet1';
    const FOLDER_ID = '1BScjKEacDNLu2aJddnxWjO4D28uChwHw';
    const ACADEMY_NAME = 'Kaizen Dental Academy';
    const TIMEZONE = 'Africa/Cairo';
    const LOGO_URL = 'https://i.imgur.com/TYcFUn5.png';
    
    // ===== GET SPREADSHEET AND FOLDER =====
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
    const folder = DriveApp.getFolderById(FOLDER_ID);
    
    // ===== PARSE FORM DATA =====
    const params = e.parameter || {};
    
    Logger.log('Parameters received: ' + Object.keys(params).join(', '));
    
    const firstName = (params.firstName || '').toString().trim();
    const lastName = (params.lastName || '').toString().trim();
    const email = (params.email || '').toString().trim();
    const phone = (params.phone || '').toString().trim();
    const country = (params.country || '').toString().trim();
    const clinic = (params.clinic || '').toString().trim();
    const faculty = (params.faculty || '').toString().trim();
    const gradYear = (params.gradYear || '').toString().trim();
    const moreInfo = (params.moreInfo || '').toString().trim();
    
    // Validate email
    if (!email) {
      return createResponse({ success: false, error: 'Email is required' });
    }
    
    // ===== HANDLE FILE UPLOAD - MULTIPLE METHODS =====
    let fileLink = '';
    let fileName = '';
    
    const timestamp = Utilities.formatDate(new Date(), TIMEZONE, 'yyyy-MM-dd_HH-mm-ss');
    const safeName = (firstName + '_' + lastName).replace(/[^\w\-]+/g, '_');
    
    Logger.log('🔍 === FILE UPLOAD DETECTION ===');
    
    // METHOD 1: Check e.parameter.transaction (for multipart/form-data)
    if (params.transaction) {
      Logger.log('✅ Found params.transaction');
      Logger.log('Type: ' + typeof params.transaction);
      
      try {
        // Try to get as Blob
        const fileBlob = params.transaction;
        
        if (fileBlob && typeof fileBlob.getBytes === 'function') {
          Logger.log('✅ Confirmed: params.transaction is a Blob!');
          const bytes = fileBlob.getBytes();
          const contentType = fileBlob.getContentType ? fileBlob.getContentType() : 'image/jpeg';
          
          Logger.log('File size: ' + bytes.length + ' bytes');
          Logger.log('Content type: ' + contentType);
          
          let extension = '.jpg';
          if (contentType.includes('png')) extension = '.png';
          else if (contentType.includes('jpeg') || contentType.includes('jpg')) extension = '.jpg';
          else if (contentType.includes('pdf')) extension = '.pdf';
          else if (contentType.includes('webp')) extension = '.webp';
          
          fileName = 'Transaction_' + safeName + '_' + timestamp + extension;
          const namedBlob = Utilities.newBlob(bytes, contentType, fileName);
          const driveFile = folder.createFile(namedBlob);
          driveFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
          
          const fileId = driveFile.getId();
          fileLink = 'https://drive.google.com/file/d/' + fileId + '/view';
          
          Logger.log('✅ FILE UPLOADED SUCCESSFULLY via params.transaction!');
          Logger.log('File ID: ' + fileId);
          Logger.log('File link: ' + fileLink);
        } else {
          Logger.log('⚠️ params.transaction exists but is not a Blob');
          Logger.log('Value: ' + params.transaction);
          throw new Error('params.transaction is not a Blob');
        }
      } catch (error) {
        Logger.log('❌ Method 1 failed: ' + error.toString());
        // Continue to try other methods
      }
    }
    
    // METHOD 2: Check if file was sent as base64 in params
    if (!fileLink && params.transactionBase64) {
      Logger.log('🔍 Trying METHOD 2: transactionBase64');
      try {
        const bytes = Utilities.base64Decode(params.transactionBase64);
        const contentType = 'image/jpeg';
        fileName = 'Transaction_' + safeName + '_' + timestamp + '.jpg';
        const namedBlob = Utilities.newBlob(bytes, contentType, fileName);
        const driveFile = folder.createFile(namedBlob);
        driveFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        const fileId = driveFile.getId();
        fileLink = 'https://drive.google.com/file/d/' + fileId + '/view';
        Logger.log('✅ FILE UPLOADED via base64!');
      } catch (error) {
        Logger.log('❌ Method 2 failed: ' + error.toString());
      }
    }
    
    // METHOD 3: Parse multipart/form-data from postData.contents
    if (!fileLink && e.postData && e.postData.type && e.postData.type.includes('multipart')) {
      Logger.log('🔍 Trying METHOD 3: Parse multipart from postData');
      try {
        const boundary = e.postData.type.split('boundary=')[1];
        const parts = e.postData.contents.split('--' + boundary);
        
        for (let i = 0; i < parts.length; i++) {
          const part = parts[i];
          if (part.includes('name="transaction"')) {
            Logger.log('✅ Found transaction in multipart data!');
            
            // Extract file content (skip headers)
            const fileContentStart = part.indexOf('\r\n\r\n') + 4;
            const fileContentEnd = part.lastIndexOf('\r\n--');
            const fileBytes = part.substring(fileContentStart, fileContentEnd);
            
            // Get content type from headers
            let contentType = 'image/jpeg';
            if (part.includes('Content-Type:')) {
              const contentTypeMatch = part.match(/Content-Type:\s*([^\r\n]+)/);
              if (contentTypeMatch) {
                contentType = contentTypeMatch[1].trim();
              }
            }
            
            // Determine extension
            let extension = '.jpg';
            if (contentType.includes('png')) extension = '.png';
            else if (contentType.includes('jpeg') || contentType.includes('jpg')) extension = '.jpg';
            else if (contentType.includes('pdf')) extension = '.pdf';
            
            fileName = 'Transaction_' + safeName + '_' + timestamp + extension;
            
            // Create blob from bytes
            const blob = Utilities.newBlob(
              Utilities.newBlob(fileBytes).getBytes(),
              contentType,
              fileName
            );
            
            const driveFile = folder.createFile(blob);
            driveFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
            const fileId = driveFile.getId();
            fileLink = 'https://drive.google.com/file/d/' + fileId + '/view';
            
            Logger.log('✅ FILE UPLOADED via multipart parsing!');
            Logger.log('File ID: ' + fileId);
            break;
          }
        }
      } catch (error) {
        Logger.log('❌ Method 3 failed: ' + error.toString());
      }
    }
    
    // If still no file, log what we received
    if (!fileLink) {
      Logger.log('⚠️ NO FILE DETECTED');
      Logger.log('All parameter keys: ' + JSON.stringify(Object.keys(params)));
      Logger.log('postData type: ' + (e.postData ? e.postData.type : 'N/A'));
      fileLink = 'No file uploaded - check logs';
    }
    
    // ===== SAVE TO GOOGLE SHEET =====
    const timeStamp = Utilities.formatDate(new Date(), TIMEZONE, 'yyyy-MM-dd HH:mm:ss');
    
    sheet.appendRow([
      timeStamp,
      firstName,
      lastName,
      email,
      phone,
      country,
      clinic,
      faculty,
      gradYear,
      moreInfo,
      fileLink
    ]);
    
    Logger.log('✅ Data saved to sheet');
    Logger.log('File link in sheet: ' + fileLink);
    
    // ===== SEND EMAIL TO PARTICIPANT =====
    const fullName = (firstName + ' ' + lastName).trim() || 'Participant';
    const emailSubject = '✅ Enrollment Received — ' + ACADEMY_NAME;
    
    const emailBody = `
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
                ${fileLink && fileLink !== 'No file uploaded' && !fileLink.includes('Error') && !fileLink.includes('check logs') ? `<div style="margin-bottom:8px;"><b>Transaction File:</b> <a href="${fileLink}" target="_blank">View Screenshot</a></div>` : ''}
              </div>
            </div>
            <p style="font-size:13px;color:#777;margin:0;">
              Submitted: ${timeStamp} (Cairo Time)
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
    `;
    
    MailApp.sendEmail({
      to: email,
      subject: emailSubject,
      htmlBody: emailBody,
      name: ACADEMY_NAME
    });
    
    Logger.log('✅ Email sent to: ' + email);
    
    // ===== RETURN SUCCESS =====
    return createResponse({
      success: true,
      message: 'Enrollment submitted successfully',
      fileLink: fileLink
    });
    
  } catch (error) {
    Logger.log('❌ FATAL ERROR: ' + error.toString());
    Logger.log('Stack trace: ' + error.stack);
    return createResponse({
      success: false,
      error: error.toString()
    });
  }
}

// Handle CORS preflight
function doOptions(e) {
  const output = ContentService.createTextOutput('');
  output.setMimeType(ContentService.MimeType.TEXT);
  output.setHeader('Access-Control-Allow-Origin', '*');
  output.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  output.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  return output;
}

// Create JSON response with CORS headers
function createResponse(data) {
  const output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  output.setHeader('Access-Control-Allow-Origin', '*');
  return output;
}


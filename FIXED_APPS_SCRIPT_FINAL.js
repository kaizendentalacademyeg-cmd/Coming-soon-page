function doPost(e) {
  try {
    Logger.log('=== NEW REQUEST ===');
    
    // Safely check for postData
    const postDataType = (e && e.postData && e.postData.type) ? e.postData.type : 'unknown';
    Logger.log('Request type: ' + postDataType);
    Logger.log('Has e.parameter: ' + (e && e.parameter ? 'YES' : 'NO'));
    Logger.log('Has e.postData: ' + (e && e.postData ? 'YES' : 'NO'));
    
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
    const params = (e && e.parameter) ? e.parameter : {};
    
    Logger.log('Parameters received: ' + Object.keys(params).join(', '));
    Logger.log('All parameter keys: ' + JSON.stringify(Object.keys(params)));
    
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
    Logger.log('Has e.files: ' + (e && e.files ? 'YES' : 'NO'));
    if (e && e.files) {
      Logger.log('e.files keys: ' + Object.keys(e.files).join(', '));
    }
    Logger.log('Has e.parameter: ' + (e && e.parameter ? 'YES' : 'NO'));
    if (e && e.parameter) {
      Logger.log('e.parameter keys: ' + Object.keys(e.parameter).join(', '));
    }
    
    // METHOD 1: Check e.files.transaction (CORRECT way for FormData file uploads)
    if (e && e.files && e.files.transaction) {
      Logger.log('✅ Found e.files.transaction (CORRECT METHOD!)');
      
      try {
        const fileBlob = e.files.transaction;
        
        Logger.log('File blob type: ' + typeof fileBlob);
        Logger.log('File blob has getBytes: ' + (fileBlob && typeof fileBlob.getBytes === 'function'));
        
        if (fileBlob && typeof fileBlob.getBytes === 'function') {
          Logger.log('✅ Confirmed: e.files.transaction is a Blob!');
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
          
          Logger.log('Creating file with name: ' + fileName);
          
          // Create blob with proper name
          const namedBlob = Utilities.newBlob(bytes, contentType, fileName);
          
          // Create file in Google Drive
          const driveFile = folder.createFile(namedBlob);
          driveFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
          
          const fileId = driveFile.getId();
          fileLink = 'https://drive.google.com/file/d/' + fileId + '/view';
          
          Logger.log('✅ FILE UPLOADED SUCCESSFULLY via e.files.transaction!');
          Logger.log('File ID: ' + fileId);
          Logger.log('File link: ' + fileLink);
        } else {
          Logger.log('⚠️ e.files.transaction exists but is not a Blob');
          fileLink = 'Error: File is not a Blob';
        }
      } catch (fileError) {
        Logger.log('❌ File upload error: ' + fileError.toString());
        Logger.log('Error stack: ' + (fileError.stack || 'No stack trace'));
        fileLink = 'Error: ' + fileError.toString();
      }
    }
    
    // METHOD 2: Check e.parameter.transaction (fallback for multipart/form-data)
    if (!fileLink && params.transaction) {
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
          
          Logger.log('Creating file with name: ' + fileName);
          
          // Create blob with proper name
          const namedBlob = Utilities.newBlob(bytes, contentType, fileName);
          
          // Create file in Google Drive
          const driveFile = folder.createFile(namedBlob);
          driveFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
          
          const fileId = driveFile.getId();
          fileLink = 'https://drive.google.com/file/d/' + fileId + '/view';
          
          Logger.log('✅ FILE UPLOADED SUCCESSFULLY via params.transaction!');
          Logger.log('File ID: ' + fileId);
          Logger.log('File link: ' + fileLink);
        } else {
          Logger.log('⚠️ params.transaction exists but is not a Blob');
          Logger.log('Value type: ' + typeof fileBlob);
          Logger.log('Value: ' + String(fileBlob).substring(0, 100));
          
          // Try to create blob from string/bytes
          try {
            const contentType = 'image/jpeg';
            fileName = 'Transaction_' + safeName + '_' + timestamp + '.jpg';
            const namedBlob = Utilities.newBlob(fileBlob, contentType, fileName);
            const driveFile = folder.createFile(namedBlob);
            driveFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
            const fileId = driveFile.getId();
            fileLink = 'https://drive.google.com/file/d/' + fileId + '/view';
            Logger.log('✅ File uploaded via alternative blob creation!');
          } catch (altError) {
            Logger.log('❌ Alternative method failed: ' + altError.toString());
            fileLink = 'Error: File could not be processed - ' + altError.toString();
          }
        }
      } catch (fileError) {
        Logger.log('❌ File upload error: ' + fileError.toString());
        Logger.log('Error stack: ' + (fileError.stack || 'No stack trace'));
        fileLink = 'Error: ' + fileError.toString();
      }
    } else {
      Logger.log('⚠️ No params.transaction found');
      Logger.log('All parameter keys: ' + JSON.stringify(Object.keys(params)));
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
    
    // METHOD 3: Parse multipart/form-data from postData.contents (if available)
    if (!fileLink && e && e.postData && e.postData.type && e.postData.type.includes('multipart')) {
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
      Logger.log('⚠️ NO FILE DETECTED AFTER ALL METHODS');
      Logger.log('All parameter keys: ' + JSON.stringify(Object.keys(params)));
      Logger.log('postData type: ' + postDataType);
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
    Logger.log('Stack trace: ' + (error.stack || 'No stack trace'));
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

// Create JSON response with CORS headers - FIXED: No chaining!
function createResponse(data) {
  const output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  output.setHeader('Access-Control-Allow-Origin', '*');
  return output;
}


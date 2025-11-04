function doPost(e) {
  try {
    Logger.log('=== NEW REQUEST ===');
    Logger.log('Request type: ' + (e.postData ? e.postData.type : 'unknown'));
    
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
    const params = e.parameter;
    
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
    
    // ===== HANDLE FILE UPLOAD =====
    let fileLink = '';
    let fileName = '';
    
    const timestamp = Utilities.formatDate(new Date(), TIMEZONE, 'yyyy-MM-dd_HH-mm-ss');
    const safeName = (firstName + '_' + lastName).replace(/[^\w\-]+/g, '_');
    
    Logger.log('🔍 Checking for file upload...');
    Logger.log('e.parameter.transaction exists: ' + (params.transaction ? 'YES' : 'NO'));
    Logger.log('e.parameter.transaction type: ' + (params.transaction ? typeof params.transaction : 'N/A'));
    
    // IMPORTANT: In Google Apps Script, files come through e.parameter as Blob objects
    // But we need to check if it's actually a Blob
    if (params.transaction) {
      try {
        Logger.log('✅ Transaction parameter found!');
        
        // The transaction parameter should be a Blob
        // In Apps Script, when FormData sends a file, it comes as a Blob in e.parameter
        const fileBlob = params.transaction;
        
        Logger.log('File blob type: ' + typeof fileBlob);
        Logger.log('File blob has getBytes: ' + (fileBlob && typeof fileBlob.getBytes === 'function'));
        Logger.log('File blob has getContentType: ' + (fileBlob && typeof fileBlob.getContentType === 'function'));
        
        // Check if it's a Blob
        if (fileBlob && typeof fileBlob.getBytes === 'function') {
          Logger.log('✅ Confirmed: It is a Blob object!');
          
          // Get file bytes and content type
          const bytes = fileBlob.getBytes();
          const contentType = fileBlob.getContentType ? fileBlob.getContentType() : 'image/jpeg';
          
          Logger.log('File size: ' + bytes.length + ' bytes');
          Logger.log('Content type: ' + contentType);
          
          // Determine file extension
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
          
          Logger.log('✅ File uploaded successfully!');
          Logger.log('File ID: ' + fileId);
          Logger.log('File link: ' + fileLink);
        } else {
          // Try to access as base64 or other format
          Logger.log('⚠️ File is not a Blob. Trying alternative method...');
          Logger.log('File value: ' + fileBlob);
          
          // Sometimes files come as strings or other formats
          // Try to create a blob from the value
          try {
            const contentType = 'image/jpeg'; // Default
            const namedBlob = Utilities.newBlob(fileBlob, contentType, 'Transaction_' + safeName + '_' + timestamp + '.jpg');
            const driveFile = folder.createFile(namedBlob);
            driveFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
            const fileId = driveFile.getId();
            fileLink = 'https://drive.google.com/file/d/' + fileId + '/view';
            Logger.log('✅ File uploaded via alternative method!');
          } catch (altError) {
            Logger.log('❌ Alternative method failed: ' + altError);
            fileLink = 'Error: File could not be processed - ' + altError.toString();
          }
        }
      } catch (fileError) {
        Logger.log('❌ File upload error: ' + fileError.toString());
        Logger.log('Error stack: ' + fileError.stack);
        fileLink = 'Error: ' + fileError.toString();
      }
    } else {
      Logger.log('⚠️ No transaction parameter found in request');
      Logger.log('All parameters: ' + JSON.stringify(Object.keys(params)));
      fileLink = 'No file uploaded';
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
    
    Logger.log('✅ Data saved to sheet with file link: ' + fileLink);
    
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
                ${fileLink && fileLink !== 'No file uploaded' && !fileLink.includes('Error') ? `<div style="margin-bottom:8px;"><b>Transaction File:</b> <a href="${fileLink}" target="_blank">View Screenshot</a></div>` : ''}
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


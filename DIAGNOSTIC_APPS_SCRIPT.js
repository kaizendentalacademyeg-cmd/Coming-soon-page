function doPost(e) {
  try {
    Logger.log('=== DIAGNOSTIC - NEW REQUEST ===');
    
    // Log EVERYTHING about the request
    Logger.log('e exists: ' + (e ? 'YES' : 'NO'));
    Logger.log('e.type: ' + (e && e.type ? e.type : 'N/A'));
    
    // Check e.files
    Logger.log('=== CHECKING e.files ===');
    Logger.log('e.files exists: ' + (e && e.files ? 'YES' : 'NO'));
    if (e && e.files) {
      Logger.log('e.files is object: ' + (typeof e.files === 'object' ? 'YES' : 'NO'));
      Logger.log('e.files keys: ' + Object.keys(e.files).join(', '));
      Logger.log('e.files.transaction exists: ' + (e.files.transaction ? 'YES' : 'NO'));
      if (e.files.transaction) {
        Logger.log('e.files.transaction type: ' + typeof e.files.transaction);
        Logger.log('e.files.transaction has getBytes: ' + (typeof e.files.transaction.getBytes === 'function' ? 'YES' : 'NO'));
      }
    }
    
    // Check e.parameter
    Logger.log('=== CHECKING e.parameter ===');
    Logger.log('e.parameter exists: ' + (e && e.parameter ? 'YES' : 'NO'));
    if (e && e.parameter) {
      Logger.log('e.parameter keys: ' + Object.keys(e.parameter).join(', '));
      Logger.log('e.parameter.transaction exists: ' + (e.parameter.transaction ? 'YES' : 'NO'));
      if (e.parameter.transaction) {
        Logger.log('e.parameter.transaction type: ' + typeof e.parameter.transaction);
      }
    }
    
    // Check e.postData
    Logger.log('=== CHECKING e.postData ===');
    Logger.log('e.postData exists: ' + (e && e.postData ? 'YES' : 'NO'));
    if (e && e.postData) {
      Logger.log('e.postData.type: ' + (e.postData.type || 'N/A'));
      Logger.log('e.postData.contents length: ' + (e.postData.contents ? e.postData.contents.length : 0));
    }
    
    // ===== CONFIGURATION =====
    const SHEET_ID = '1jiaJbHg_g8yu-t-WqsTZmQDIEd9Zhkt4R8RjHzNVVMI';
    const SHEET_NAME = 'Sheet1';
    const FOLDER_ID = '1BScjKEacDNLu2aJddnxWjO4D28uChwHw';
    const ACADEMY_NAME = 'Kaizen Dental Academy';
    const TIMEZONE = 'Africa/Cairo';
    
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
    const folder = DriveApp.getFolderById(FOLDER_ID);
    
    const params = (e && e.parameter) ? e.parameter : {};
    
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
    
    let fileLink = '';
    const timestamp = Utilities.formatDate(new Date(), TIMEZONE, 'yyyy-MM-dd_HH-mm-ss');
    const safeName = (firstName + '_' + lastName).replace(/[^\w\-]+/g, '_');
    
    Logger.log('=== ATTEMPTING FILE UPLOAD ===');
    
    // METHOD 1: e.files.transaction
    if (e && e.files && e.files.transaction) {
      Logger.log('✅ METHOD 1: Found e.files.transaction');
      try {
        const fileBlob = e.files.transaction;
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
        const namedBlob = Utilities.newBlob(bytes, contentType, fileName);
        const driveFile = folder.createFile(namedBlob);
        driveFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        fileLink = 'https://drive.google.com/file/d/' + driveFile.getId() + '/view';
        
        Logger.log('✅✅✅ FILE UPLOADED SUCCESSFULLY! ✅✅✅');
        Logger.log('File ID: ' + driveFile.getId());
        Logger.log('File link: ' + fileLink);
      } catch (err) {
        Logger.log('❌ METHOD 1 FAILED: ' + err.toString());
        Logger.log('Error stack: ' + (err.stack || 'No stack'));
        fileLink = 'Error: ' + err.toString();
      }
    } else {
      Logger.log('❌ METHOD 1: e.files.transaction NOT FOUND');
    }
    
    // METHOD 2: e.parameter.transaction (fallback)
    if (!fileLink && params.transaction && typeof params.transaction.getBytes === 'function') {
      Logger.log('✅ METHOD 2: Found params.transaction');
      try {
        const fileBlob = params.transaction;
        const bytes = fileBlob.getBytes();
        const contentType = fileBlob.getContentType() || 'image/jpeg';
        
        let ext = '.jpg';
        if (contentType.includes('png')) ext = '.png';
        else if (contentType.includes('jpeg') || contentType.includes('jpg')) ext = '.jpg';
        else if (contentType.includes('pdf')) ext = '.pdf';
        
        const fileName = 'Transaction_' + safeName + '_' + timestamp + ext;
        const namedBlob = Utilities.newBlob(bytes, contentType, fileName);
        const driveFile = folder.createFile(namedBlob);
        driveFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        fileLink = 'https://drive.google.com/file/d/' + driveFile.getId() + '/view';
        
        Logger.log('✅✅✅ FILE UPLOADED via METHOD 2! ✅✅✅');
      } catch (err) {
        Logger.log('❌ METHOD 2 FAILED: ' + err.toString());
        fileLink = 'Error: ' + err.toString();
      }
    } else {
      Logger.log('❌ METHOD 2: params.transaction NOT FOUND or not a Blob');
    }
    
    if (!fileLink) {
      Logger.log('⚠️⚠️⚠️ NO FILE UPLOADED - CHECK LOGS ABOVE ⚠️⚠️⚠️');
      fileLink = 'No file uploaded';
    }
    
    const ts = Utilities.formatDate(new Date(), TIMEZONE, 'yyyy-MM-dd HH:mm:ss');
    sheet.appendRow([
      ts, firstName, lastName, email, phone, country,
      clinic, faculty, gradYear, moreInfo, fileLink
    ]);
    
    Logger.log('✅ Data saved to sheet');
    
    MailApp.sendEmail({
      to: email,
      subject: `✅ Enrollment Received — ${ACADEMY_NAME}`,
      htmlBody: `<p>Dear ${firstName || 'Participant'},</p>
                 <p>We received your enrollment. We'll contact you shortly.</p>
                 <p>File link: ${fileLink}</p>
                 <p>Best regards,<br>${ACADEMY_NAME}</p>`,
      name: ACADEMY_NAME
    });
    
    Logger.log('✅ Email sent');
    
    return jsonResponse({ success: true, message: 'Saved', fileLink });
    
  } catch (err) {
    Logger.log('❌❌❌ FATAL ERROR: ' + err.toString());
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



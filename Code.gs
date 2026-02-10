// ==========================================
//  COMPLETE EVENT MANAGEMENT SYSTEM
// ==========================================

// YOUR GOOGLE DRIVE FOLDER ID
const QR_FOLDER_ID = '1i5qWAxfA5WSirT3WbQ6dfRMQa9_REZ02';

// CORRECT SHEET NAME (with spaces!)
const SHEET_NAME = 'Form Responses 1';

// COLUMN CONFIGURATION
const COLUMNS = {
	TIMESTAMP: 1,
	EMAIL_B: 2,
	NAME: 3,
	EMAIL: 4,
	CERT_ID: 5,
	STATUS: 6,
	SCAN_TIME: 7
};

// ==========================================
//  1. REGISTRATION
// ==========================================

function onFormSubmit(e) {
	if (!e || !e.range) return;

	const sheet = e.range.getSheet();
	const row = e.range.getRow();

	const name = sheet.getRange(row, COLUMNS.NAME).getValue();
	const email = sheet.getRange(row, COLUMNS.EMAIL).getValue();

	const certId = 'CERT-' + Utilities.getUuid().slice(0, 8).toUpperCase();
	const qrData = name + ' | ' + certId;
	const qrUrl = 'https://quickchart.io/qr?size=300&margin=1&text=' + encodeURIComponent(qrData);

	// Save to Drive
	try {
		const qrBlob = UrlFetchApp.fetch(qrUrl).getBlob();
		qrBlob.setName(name + ' - ' + certId + '.png');
		const folder = DriveApp.getFolderById(QR_FOLDER_ID);
		folder.createFile(qrBlob);
	} catch (err) {
		Logger.log('Drive error: ' + err);
	}

	// Send Email
	try {
		const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; text-align: center; padding: 30px;">
        <h2> Registration Confirmed!</h2>
        <p>Hello <strong>${name}</strong>,</p>
        <p>Present this QR code at the event:</p>
        <img src="${qrUrl}" width="250" height="250" />
        <p><strong>${name}</strong><br/>ID: ${certId}</p>
      </div>
    `;
		GmailApp.sendEmail(email, ' Your Event QR Code', '', { htmlBody: htmlBody });
	} catch (err) {
		Logger.log('Email error: ' + err);
	}

	// Update Sheet
	sheet.getRange(row, COLUMNS.CERT_ID).setValue(certId);
	sheet.getRange(row, COLUMNS.STATUS).setValue('QR SENT');
}

// ==========================================
//  2. SCANNING (doPost)
// ==========================================

function doPost(e) {
	try {
		const data = JSON.parse(e.postData.contents);
		const qrContent = data.qrContent;

		Logger.log(' Scan received: ' + qrContent);

		const ss = SpreadsheetApp.getActiveSpreadsheet();
		const sheet = ss.getSheetByName(SHEET_NAME);

		if (!sheet) {
			Logger.log(' Sheet not found: ' + SHEET_NAME);
			return createResponse(false, 'Sheet not found', '');
		}

		const values = sheet.getDataRange().getValues();
		let found = false;
		let message = '';
		let attendeeName = '';

		for (let i = 1; i < values.length; i++) {
			const rowCertId = String(values[i][COLUMNS.CERT_ID - 1]).trim();
			const rowName = String(values[i][COLUMNS.NAME - 1]).trim();

			if (rowCertId && qrContent.includes(rowCertId)) {
				found = true;
				attendeeName = rowName;

				const currentStatus = String(values[i][COLUMNS.STATUS - 1]).trim();

				if (currentStatus === 'ATTENDED') {
					message = 'Already checked in: ' + rowName;
				} else {
					sheet.getRange(i + 1, COLUMNS.STATUS).setValue('ATTENDED');
					sheet.getRange(i + 1, COLUMNS.SCAN_TIME).setValue(new Date());
					message = 'Welcome, ' + rowName + '!';
					Logger.log(' Marked ATTENDED: ' + rowName);
				}
				break;
			}
		}

		if (!found) {
			message = 'QR Code not found';
			Logger.log(' No match for: ' + qrContent);
		}

		return createResponse(found, message, attendeeName);
	} catch (error) {
		Logger.log(' Error: ' + error);
		return createResponse(false, 'Error: ' + error, '');
	}
}

// ==========================================
//  3. GET ATTENDEES (doGet)
// ==========================================

function doGet(e) {
	try {
		const ss = SpreadsheetApp.getActiveSpreadsheet();
		const sheet = ss.getSheetByName(SHEET_NAME);

		if (!sheet) {
			return ContentService.createTextOutput(
				JSON.stringify({
					success: false,
					message: 'Sheet not found',
					attendees: []
				})
			).setMimeType(ContentService.MimeType.JSON);
		}

		const values = sheet.getDataRange().getValues();
		const attendedList = [];

		for (let i = 1; i < values.length; i++) {
			if (String(values[i][COLUMNS.STATUS - 1]).trim() === 'ATTENDED') {
				attendedList.push({
					name: values[i][COLUMNS.NAME - 1],
					email: values[i][COLUMNS.EMAIL - 1],
					certId: values[i][COLUMNS.CERT_ID - 1],
					scanTime: values[i][COLUMNS.SCAN_TIME - 1]
						? new Date(values[i][COLUMNS.SCAN_TIME - 1]).toLocaleString()
						: ''
				});
			}
		}

		return ContentService.createTextOutput(
			JSON.stringify({
				success: true,
				count: attendedList.length,
				attendees: attendedList
			})
		).setMimeType(ContentService.MimeType.JSON);
	} catch (error) {
		return ContentService.createTextOutput(
			JSON.stringify({
				success: false,
				message: error.toString(),
				attendees: []
			})
		).setMimeType(ContentService.MimeType.JSON);
	}
}

// ==========================================
//  HELPER
// ==========================================

function createResponse(success, message, name) {
	return ContentService.createTextOutput(
		JSON.stringify({
			success: success,
			message: message,
			name: name
		})
	).setMimeType(ContentService.MimeType.JSON);
}

// ==========================================
//  TEST FUNCTIONS
// ==========================================

function testFullFlow() {
	const ss = SpreadsheetApp.getActiveSpreadsheet();
	const sheet = ss.getSheetByName(SHEET_NAME);

	if (!sheet) {
		Logger.log(" Sheet '" + SHEET_NAME + "' NOT FOUND!");
		return;
	}

	Logger.log(' Found sheet: ' + sheet.getName());

	// Add test row
	const testRow = sheet.getLastRow() + 1;
	const testCertId = 'CERT-TEST' + Math.random().toString(36).substring(2, 6).toUpperCase();
	const testName = 'Test User';

	sheet.getRange(testRow, 1).setValue(new Date());
	sheet.getRange(testRow, 2).setValue('test@test.com');
	sheet.getRange(testRow, 3).setValue(testName);
	sheet.getRange(testRow, 4).setValue('test@test.com');
	sheet.getRange(testRow, 5).setValue(testCertId);
	sheet.getRange(testRow, 6).setValue('QR SENT');

	Logger.log(' Test row added: ' + testCertId);

	// Test scan
	const testData = {
		postData: { contents: JSON.stringify({ qrContent: testName + ' | ' + testCertId }) }
	};

	const result = doPost(testData);
	Logger.log(' Scan result: ' + result.getContent());

	const newStatus = sheet.getRange(testRow, 6).getValue();
	Logger.log(' New status: ' + newStatus);

	if (newStatus === 'ATTENDED') {
		Logger.log(' SUCCESS! Everything is working!');
	}
}

function listAllSheetNames() {
	const ss = SpreadsheetApp.getActiveSpreadsheet();
	const sheets = ss.getSheets();
	Logger.log(' ALL SHEETS:');
	sheets.forEach((s, i) => Logger.log(i + 1 + ". '" + s.getName() + "'"));
}

// ==========================================
//  UNIVERSAL ATTENDANCE SYSTEM
//  100% Dynamic - All config from Settings tab
//  Works on ANY Google Account
// ==========================================

////////
// ==========================================
//  1. READ ALL CONFIG FROM "Settings" TAB
// ==========================================

function getSettings() {
	var ss = SpreadsheetApp.getActiveSpreadsheet();
	var sheet = ss.getSheetByName('Settings');

	if (!sheet) {
		throw new Error('Settings tab not found! Run setup() first.');
	}

	var data = sheet.getDataRange().getValues();
	var config = {};

	for (var i = 1; i < data.length; i++) {
		var key = String(data[i][0] || '').trim();
		var value = String(data[i][1] || '').trim();
		if (key && value) config[key] = value;
	}

	// Validate required settings
	var required = ['REG_SHEET_TAB'];
	for (var r = 0; r < required.length; r++) {
		if (!config[required[r]]) {
			throw new Error('Missing required setting: ' + required[r] + '. Check your Settings tab.');
		}
	}

	return config;
}

// ==========================================
//  2. AUTO-DETECT COLUMNS BY HEADER NAME
// ==========================================

function getColumnMap(sheet) {
	var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
	var map = {};

	for (var i = 0; i < headers.length; i++) {
		var header = String(headers[i]).trim();
		if (header) {
			map[header] = i + 1; // 1-indexed column number
		}
	}

	return map;
}

function normalizeHeader(text) {
	// Strip colons, asterisks, extra spaces from header text
	return String(text).replace(/[:*]/g, '').trim().toLowerCase();
}

function findColumn(map, possibleNames) {
	// Pass 1: Exact match (case-insensitive, after stripping : and *)
	for (var i = 0; i < possibleNames.length; i++) {
		var target = normalizeHeader(possibleNames[i]);
		for (var key in map) {
			if (normalizeHeader(key) === target) {
				return map[key];
			}
		}
	}

	// Pass 2: Partial match (header CONTAINS the search term)
	for (var i = 0; i < possibleNames.length; i++) {
		var target = normalizeHeader(possibleNames[i]);
		for (var key in map) {
			var normalized = normalizeHeader(key);
			if (normalized.indexOf(target) !== -1 || target.indexOf(normalized) !== -1) {
				return map[key];
			}
		}
	}

	return -1; // Not found
}

// ==========================================
//  3. REGISTRATION (Form Submit Trigger)
// ==========================================

function onFormSubmit(e) {
	if (!e || !e.range) return;

	var config = getSettings();
	var sheet = e.range.getSheet();
	var row = e.range.getRow();
	var cols = getColumnMap(sheet);

	// Find columns by common header names
	var nameCol = findColumn(cols, ['Full Name', 'Fullname', 'Name', 'Complete Name']);
	var emailCol = findColumn(cols, ['Email Address', 'Email', 'email address', 'email']);

	if (nameCol === -1 || emailCol === -1) {
		Logger.log('ERROR: Could not find Name or Email column.');
		Logger.log('Available headers: ' + JSON.stringify(Object.keys(cols)));
		return;
	}

	var name = sheet.getRange(row, nameCol).getValue();
	var email = sheet.getRange(row, emailCol).getValue();

	if (!name || !email) {
		Logger.log('ERROR: Name or Email is empty at row ' + row);
		return;
	}

	// Generate unique ID
	var certId = 'CERT-' + Utilities.getUuid().slice(0, 8).toUpperCase();
	var qrData = name + ' | ' + certId;
	var qrUrl =
		'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=' + encodeURIComponent(qrData);

	// Ensure CERT_ID, STATUS, SCAN_TIME, SIGNOUT_TIME, and email tracking columns exist (create if needed)
	var certIdCol = findColumn(cols, ['CERT_ID', 'Certificate ID', 'CertID']);
	var statusCol = findColumn(cols, ['STATUS', 'Status', 'Attendance Status']);
	var scanTimeCol = findColumn(cols, ['SCAN_TIME', 'Scan Time', 'Check-in Time']);
	var signoutTimeCol = findColumn(cols, [
		'SIGNOUT_TIME',
		'Signout Time',
		'Sign Out Time',
		'Checkout Time'
	]);
	var emailSentToCol = findColumn(cols, ['EMAIL_SENT_TO', 'Email Sent To']);
	var emailSentAtCol = findColumn(cols, ['EMAIL_SENT_AT', 'Email Sent At']);
	var emailStatusCol = findColumn(cols, ['EMAIL_STATUS', 'Email Status']);

	if (certIdCol === -1) {
		certIdCol = sheet.getLastColumn() + 1;
		sheet.getRange(1, certIdCol).setValue('CERT_ID');
	}
	if (statusCol === -1) {
		statusCol = sheet.getLastColumn() + 1;
		sheet.getRange(1, statusCol).setValue('STATUS');
	}
	if (scanTimeCol === -1) {
		scanTimeCol = sheet.getLastColumn() + 1;
		sheet.getRange(1, scanTimeCol).setValue('SCAN_TIME');
	}
	if (signoutTimeCol === -1) {
		signoutTimeCol = sheet.getLastColumn() + 1;
		sheet.getRange(1, signoutTimeCol).setValue('SIGNOUT_TIME');
	}
	if (emailSentToCol === -1) {
		emailSentToCol = sheet.getLastColumn() + 1;
		sheet.getRange(1, emailSentToCol).setValue('EMAIL_SENT_TO');
	}
	if (emailSentAtCol === -1) {
		emailSentAtCol = sheet.getLastColumn() + 1;
		sheet.getRange(1, emailSentAtCol).setValue('EMAIL_SENT_AT');
	}
	if (emailStatusCol === -1) {
		emailStatusCol = sheet.getLastColumn() + 1;
		sheet.getRange(1, emailStatusCol).setValue('EMAIL_STATUS');
	}

	// Get branding from settings
	var eventName = config.EVENT_NAME || 'Event';
	var orgName = config.ORG_NAME || '';
	var primaryColor = config.PRIMARY_COLOR || '#800000';
	var accentColor = config.ACCENT_COLOR || '#FFD700';

	// Send QR email
	var emailSuccess = false;
	var emailError = '';
	try {
		var htmlBody =
			'<!DOCTYPE html><html><head>' +
			'<meta name="color-scheme" content="light dark">' +
			'<meta name="supported-color-schemes" content="light dark">' +
			'<meta name="viewport" content="width=device-width, initial-scale=1.0">' +
			'<style>' +
			':root { color-scheme: light dark; supported-color-schemes: light dark; } ' +
			'.darkmode-white { color: #fffffe !important; -webkit-text-fill-color: #fffffe !important; } ' +
			'.darkmode-dark { color: #333333 !important; -webkit-text-fill-color: #333333 !important; } ' +
			'.darkmode-gray { color: #555555 !important; -webkit-text-fill-color: #555555 !important; } ' +
			'.darkmode-bg { background-color: #fcfcfc !important; } ' +
			'@media only screen and (max-width: 600px) { ' +
			'  .responsive-td { display: block !important; width: 100% !important; border-left: none !important; border-top: 1px solid #eeeeee !important; padding: 30px 20px !important; box-sizing: border-box !important; } ' +
			'  .responsive-td-left { padding: 30px 20px !important; box-sizing: border-box !important; } ' +
			'  .mobile-black { color: #000000 !important; -webkit-text-fill-color: #000000 !important; text-shadow: none !important; mix-blend-mode: normal !important; text-align: center !important; } ' +
			'} ' +
			'</style></head><body style="margin:0;padding:0;background-color:#f4f4f4;">' +
			'<div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto; padding: 30px 20px;">' +
			'<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: #ffffff; border: 1px solid #ddd; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">' +
			'<tr>' +
			'<td colspan="2" style="background: linear-gradient(135deg, ' +
			primaryColor +
			', #333); padding: 25px 30px; text-align: center;">' +
			'<h2 class="darkmode-white mobile-black" style="color: #ffffff; -webkit-text-fill-color: #ffffff; margin: 0; font-size: 24px; letter-spacing: 0.5px; text-align: center;">' +
			eventName +
			'</h2>' +
			(orgName
				? '<p class="darkmode-white mobile-black" style="color: #ffffff; -webkit-text-fill-color: #ffffff; margin: 8px 0 0 0; font-size: 14px; opacity: 0.95; text-align: center;">' +
					orgName +
					'</p>'
				: '') +
			'</td>' +
			'</tr>' +
			'<tr>' +
			'<td width="55%" class="responsive-td responsive-td-left" style="padding: 40px 30px; vertical-align: middle;">' +
			'<h3 class="darkmode-dark" style="color: #333333; margin-top: 0; font-size: 22px;">Registration Confirmed!</h3>' +
			'<p class="darkmode-gray" style="color: #555555; font-size: 15px; line-height: 1.6;">Hello <strong>' +
			name +
			'</strong>,</p>' +
			'<p class="darkmode-gray" style="color: #555555; font-size: 15px; line-height: 1.6;">You are successfully registered. Please present the QR code at the entrance of the event for quick check-in.</p>' +
			'<div style="margin-top: 25px; padding-top: 20px; border-top: 1px solid #eee; text-align: center;">' +
			'<table width="100%" cellpadding="0" cellspacing="0" border="0" style="table-layout: fixed; margin: 0 auto;">' +
			'<tr>' +
			'<td width="50%" align="center" style="padding-bottom: 4px; text-align: center;"><strong class="darkmode-dark" style="color:#333; font-size:12px; text-transform:uppercase; letter-spacing:0.5px;">Attendee</strong></td>' +
			'<td width="50%" align="center" style="padding-bottom: 4px; text-align: center;"><strong class="darkmode-dark" style="color:#333; font-size:12px; text-transform:uppercase; letter-spacing:0.5px;">Certificate ID</strong></td>' +
			'</tr>' +
			'<tr>' +
			'<td align="center" style="padding-top: 4px; text-align: center; vertical-align: top;"><span class="darkmode-gray" style="color:#555; font-size:15px; word-break: break-word;">' +
			name +
			'</span></td>' +
			'<td align="center" style="padding-top: 4px; text-align: center; vertical-align: top;"><span class="darkmode-gray" style="color:#555; font-size:15px; word-break: break-all;">' +
			certId +
			'</span></td>' +
			'</tr>' +
			'</table>' +
			'</div>' +
			'</td>' +
			'<td width="45%" class="darkmode-bg responsive-td" style="padding: 40px 30px; text-align: center; vertical-align: middle; background-color: #fcfcfc; border-left: 1px solid #eeeeee;">' +
			'<div style="background: #ffffff; padding: 15px; display: inline-block; border-radius: 12px; border: 1px solid #ddd; box-shadow: 0 4px 10px rgba(0,0,0,0.03);">' +
			'<img src="' +
			qrUrl +
			'" width="180" height="180" style="margin: 0; display: block;" alt="QR Code" />' +
			'</div>' +
			'<p class="darkmode-gray" style="color: #888888; font-size: 12px; margin-top: 15px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.5px;">Ready to Scan</p>' +
			'</td>' +
			'</tr>' +
			'<tr>' +
			'<td colspan="2" style="background: linear-gradient(135deg, ' +
			primaryColor +
			', ' +
			primaryColor +
			'); padding: 15px 30px; text-align: center;">' +
			'<p class="darkmode-white mobile-black" style="color: #ffffff; -webkit-text-fill-color: #ffffff; margin: 0; font-size: 12px; opacity: 0.95; text-align: center;">' +
			eventName +
			'</p>' +
			'</td>' +
			'</tr>' +
			'</table>' +
			'</div></body></html>';

		GmailApp.sendEmail(email, 'Your QR Code - ' + eventName, '', {
			htmlBody: htmlBody,
			name: eventName
		});
		emailSuccess = true;
		Logger.log('QR email sent to: ' + email);
	} catch (err) {
		emailError = String(err);
		Logger.log('Email error: ' + err);
	}

	// Update sheet with registration info
	sheet.getRange(row, certIdCol).setValue(certId);
	sheet.getRange(row, statusCol).setValue(emailSuccess ? 'QR SENT' : 'EMAIL FAILED');

	// Update email verification columns
	sheet.getRange(row, emailSentToCol).setValue(emailSuccess ? email : '');
	sheet.getRange(row, emailSentAtCol).setValue(emailSuccess ? new Date() : '');
	sheet
		.getRange(row, emailStatusCol)
		.setValue(emailSuccess ? 'VERIFIED SENT to ' + email : 'FAILED: ' + emailError);

	Logger.log(
		'Registered: ' + name + ' (' + certId + ') | Email: ' + (emailSuccess ? 'SENT' : 'FAILED')
	);
}

// ==========================================
//  4. GET DATA (doGet) - Returns all registrants
// ==========================================

function doGet(e) {
	try {
		var config = getSettings();
		var ss = SpreadsheetApp.getActiveSpreadsheet();
		var sheetTab = config.REG_SHEET_TAB || 'Form Responses 1';
		var sheet = ss.getSheetByName(sheetTab);

		if (!sheet) {
			return createJsonResponse({
				success: false,
				message: "Sheet '" + sheetTab + "' not found",
				registered: [],
				attendees: [],
				count: 0
			});
		}

		var cols = getColumnMap(sheet);
		var nameCol = findColumn(cols, ['Full Name', 'Fullname', 'Name', 'Complete Name']);
		var emailCol = findColumn(cols, ['Email Address', 'Email']);
		var certIdCol = findColumn(cols, ['CERT_ID', 'Certificate ID']);
		var statusCol = findColumn(cols, ['STATUS', 'Status']);
		var scanTimeCol = findColumn(cols, ['SCAN_TIME', 'Scan Time']);
		var signoutTimeCol = findColumn(cols, [
			'SIGNOUT_TIME',
			'Signout Time',
			'Sign Out Time',
			'Checkout Time'
		]);
		var emailSentToCol = findColumn(cols, ['EMAIL_SENT_TO', 'Email Sent To']);
		var emailSentAtCol = findColumn(cols, ['EMAIL_SENT_AT', 'Email Sent At']);
		var emailStatusCol = findColumn(cols, ['EMAIL_STATUS', 'Email Status']);
		var proofOfPaymentCol = findColumn(cols, [
			'Proof of Payment',
			'Upload',
			'Receipt',
			'Payment Proof',
			'Attachment',
			'proof of payment'
		]);

		if (nameCol === -1) {
			return createJsonResponse({
				success: false,
				message: 'Name column not found in headers',
				registered: [],
				attendees: [],
				count: 0
			});
		}

		var values = sheet.getDataRange().getValues();
		var registeredList = [];
		var attendedList = [];

		for (var i = 1; i < values.length; i++) {
			var name = nameCol > 0 ? String(values[i][nameCol - 1] || '').trim() : '';
			var email = emailCol > 0 ? String(values[i][emailCol - 1] || '').trim() : '';
			var certId = certIdCol > 0 ? String(values[i][certIdCol - 1] || '').trim() : '';
			var status = statusCol > 0 ? String(values[i][statusCol - 1] || '').trim() : '';
			var scanTime = scanTimeCol > 0 ? values[i][scanTimeCol - 1] : '';
			var signoutTime = signoutTimeCol > 0 ? values[i][signoutTimeCol - 1] : '';
			var emailSentTo =
				emailSentToCol > 0 ? String(values[i][emailSentToCol - 1] || '').trim() : '';
			var emailSentAt = emailSentAtCol > 0 ? values[i][emailSentAtCol - 1] : '';
			var emailStatus =
				emailStatusCol > 0 ? String(values[i][emailStatusCol - 1] || '').trim() : '';
			var proofOfPayment =
				proofOfPaymentCol > 0 ? String(values[i][proofOfPaymentCol - 1] || '').trim() : '';

			if (!name) continue; // Skip empty rows

			registeredList.push({
				name: name,
				email: email,
				certId: certId,
				status: status,
				emailSentTo: emailSentTo,
				emailSentAt: emailSentAt ? new Date(emailSentAt).toISOString() : '',
				emailStatus: emailStatus,
				proofOfPayment: proofOfPayment || 'NOT PAID'
			});

			if (status === 'ATTENDED') {
				attendedList.push({
					name: name,
					email: email,
					certId: certId,
					scanTime: scanTime ? new Date(scanTime).toISOString() : '',
					signoutTime: signoutTime ? new Date(signoutTime).toISOString() : '',
					proofOfPayment: proofOfPayment || 'NOT PAID'
				});
			}
		}

		return createJsonResponse({
			success: true,
			count: attendedList.length,
			totalRegistered: registeredList.length,
			registered: registeredList,
			attendees: attendedList,
			eventName: config.EVENT_NAME || '',
			orgName: config.ORG_NAME || '',
			primaryColor: config.PRIMARY_COLOR || '#800000',
			accentColor: config.ACCENT_COLOR || '#FFD700'
		});
	} catch (error) {
		return createJsonResponse({
			success: false,
			message: error.toString(),
			registered: [],
			attendees: [],
			count: 0
		});
	}
}

// ==========================================
//  5. SCANNING (doPost) - Mark attendance
// ==========================================

function doPost(e) {
	// Use LockService to prevent concurrent writes from simultaneous scan requests
	var lock = LockService.getScriptLock();
	try {
		lock.waitLock(10000); // Wait up to 10s for the lock
	} catch (lockErr) {
		return createJsonResponse({
			success: false,
			message: 'Server busy, please try again',
			name: ''
		});
	}

	try {
		var config = getSettings();
		var data = JSON.parse(e.postData.contents);
		var qrContent = data.qrContent;
		var action = data.action;

		// ---- Approve Payment (Mark as Cash Paid Onsite) ----
		if (action === 'approvePayment') {
			var certIdForPayment = (data.certId || '').toString().trim();
			if (!certIdForPayment) {
				lock.releaseLock();
				return createJsonResponse({ success: false, message: 'certId is required', name: '' });
			}

			var ssPay = SpreadsheetApp.getActiveSpreadsheet();
			var sheetTabPay = config.REG_SHEET_TAB || 'Form Responses 1';
			var sheetPay = ssPay.getSheetByName(sheetTabPay);
			if (!sheetPay) {
				lock.releaseLock();
				return createJsonResponse({ success: false, message: 'Sheet not found', name: '' });
			}

			var colsPay = getColumnMap(sheetPay);
			var nameColPay = findColumn(colsPay, ['Full Name', 'Fullname', 'Name', 'Complete Name']);
			var certIdColPay = findColumn(colsPay, ['CERT_ID', 'Certificate ID']);
			var proofOfPaymentColPay = findColumn(colsPay, [
				'Proof of Payment',
				'Upload',
				'Receipt',
				'Payment Proof',
				'Attachment',
				'proof of payment'
			]);

			if (certIdColPay === -1) {
				lock.releaseLock();
				return createJsonResponse({
					success: false,
					message: 'CERT_ID column not found',
					name: ''
				});
			}
			if (proofOfPaymentColPay === -1) {
				lock.releaseLock();
				return createJsonResponse({
					success: false,
					message: 'Proof of Payment column not found',
					name: ''
				});
			}

			var valuesPay = sheetPay.getDataRange().getValues();
			var foundPay = false;
			var attendeeNamePay = '';

			for (var i = 1; i < valuesPay.length; i++) {
				var rowCertIdPay = String(valuesPay[i][certIdColPay - 1] || '').trim();
				if (rowCertIdPay && rowCertIdPay === certIdForPayment) {
					sheetPay.getRange(i + 1, proofOfPaymentColPay).setValue('CASH PAID ONSITE');
					SpreadsheetApp.flush();
					attendeeNamePay = nameColPay > 0 ? String(valuesPay[i][nameColPay - 1] || '').trim() : '';
					foundPay = true;
					Logger.log('Marked CASH PAID ONSITE for: ' + attendeeNamePay + ' (' + rowCertIdPay + ')');
					break;
				}
			}

			lock.releaseLock();
			if (foundPay) {
				return createJsonResponse({
					success: true,
					message: 'Payment marked as paid (cash onsite)',
					name: attendeeNamePay
				});
			} else {
				return createJsonResponse({
					success: false,
					message: 'Attendee not found for CERT_ID: ' + certIdForPayment,
					name: ''
				});
			}
		}

		// ---- Revoke Payment (Mark as Not Paid) ----
		if (action === 'revokePayment') {
			var certIdForRevoke = (data.certId || '').toString().trim();
			if (!certIdForRevoke) {
				lock.releaseLock();
				return createJsonResponse({ success: false, message: 'certId is required', name: '' });
			}

			var ssRev = SpreadsheetApp.getActiveSpreadsheet();
			var sheetTabRev = config.REG_SHEET_TAB || 'Form Responses 1';
			var sheetRev = ssRev.getSheetByName(sheetTabRev);
			if (!sheetRev) {
				lock.releaseLock();
				return createJsonResponse({ success: false, message: 'Sheet not found', name: '' });
			}

			var colsRev = getColumnMap(sheetRev);
			var certIdColRev = findColumn(colsRev, ['CERT_ID', 'Certificate ID']);
			var proofOfPaymentColRev = findColumn(colsRev, [
				'Proof of Payment',
				'Upload',
				'Receipt',
				'Payment Proof',
				'Attachment',
				'proof of payment'
			]);

			if (certIdColRev === -1) {
				lock.releaseLock();
				return createJsonResponse({
					success: false,
					message: 'CERT_ID column not found',
					name: ''
				});
			}
			if (proofOfPaymentColRev === -1) {
				lock.releaseLock();
				return createJsonResponse({
					success: false,
					message: 'Proof of Payment column not found',
					name: ''
				});
			}

			var valuesRev = sheetRev.getDataRange().getValues();
			var foundRev = false;

			for (var i = 1; i < valuesRev.length; i++) {
				var rowCertIdRev = String(valuesRev[i][certIdColRev - 1] || '').trim();
				if (rowCertIdRev && rowCertIdRev === certIdForRevoke) {
					sheetRev.getRange(i + 1, proofOfPaymentColRev).setValue('NOT PAID');
					SpreadsheetApp.flush();
					foundRev = true;
					Logger.log('Revoked payment for CERT_ID: ' + rowCertIdRev);
					break;
				}
			}

			lock.releaseLock();
			if (foundRev) {
				return createJsonResponse({
					success: true,
					message: 'Payment marked as not paid',
					name: ''
				});
			} else {
				return createJsonResponse({
					success: false,
					message: 'Attendee not found for CERT_ID: ' + certIdForRevoke,
					name: ''
				});
			}
		}

		// ---- Send Program Link ----
		if (action === 'sendProgram') {
			var certIdForProgram = (data.certId || '').toString().trim();
			if (!certIdForProgram) {
				lock.releaseLock();
				return createJsonResponse({ success: false, message: 'certId is required', name: '' });
			}

			var ssProg = SpreadsheetApp.getActiveSpreadsheet();
			var sheetTabProg = config.REG_SHEET_TAB || 'Form Responses 1';
			var sheetProg = ssProg.getSheetByName(sheetTabProg);
			if (!sheetProg) {
				lock.releaseLock();
				return createJsonResponse({ success: false, message: 'Sheet not found', name: '' });
			}

			var colsProg = getColumnMap(sheetProg);
			var nameColProg = findColumn(colsProg, ['Full Name', 'Fullname', 'Name', 'Complete Name']);
			var emailColProg = findColumn(colsProg, ['Email Address', 'Email', 'email address', 'email']);
			var certIdColProg = findColumn(colsProg, ['CERT_ID', 'Certificate ID']);

			if (certIdColProg === -1 || emailColProg === -1 || nameColProg === -1) {
				lock.releaseLock();
				return createJsonResponse({
					success: false,
					message: 'Required columns not found',
					name: ''
				});
			}

			var valuesProg = sheetProg.getDataRange().getValues();
			var foundProg = false;
			var attendeeNameProg = '';
			var attendeeEmailProg = '';

			for (var i = 1; i < valuesProg.length; i++) {
				var rowCertIdProg = String(valuesProg[i][certIdColProg - 1] || '').trim();
				if (rowCertIdProg && rowCertIdProg === certIdForProgram) {
					attendeeNameProg = String(valuesProg[i][nameColProg - 1] || '').trim();
					attendeeEmailProg = String(valuesProg[i][emailColProg - 1] || '').trim();
					foundProg = true;
					break;
				}
			}

			if (!foundProg) {
				lock.releaseLock();
				return createJsonResponse({
					success: false,
					message: 'Attendee not found for CERT_ID: ' + certIdForProgram,
					name: ''
				});
			}

			if (!attendeeEmailProg) {
				lock.releaseLock();
				return createJsonResponse({
					success: false,
					message: 'No email address found for this attendee',
					name: attendeeNameProg
				});
			}

			var sendResult = sendProgramEmail(attendeeNameProg, attendeeEmailProg, config);
			lock.releaseLock();

			if (sendResult.success) {
				return createJsonResponse({
					success: true,
					message: 'Program sent to ' + attendeeEmailProg,
					name: attendeeNameProg
				});
			} else {
				return createJsonResponse({
					success: false,
					message: 'Failed to send program: ' + sendResult.error,
					name: attendeeNameProg
				});
			}
		}

		// ---- Default: Mark attendance (QR scan) ----
		Logger.log('Scan received: ' + qrContent);

		var ss = SpreadsheetApp.getActiveSpreadsheet();
		var sheetTab = config.REG_SHEET_TAB || 'Form Responses 1';
		var sheet = ss.getSheetByName(sheetTab);

		if (!sheet) {
			lock.releaseLock();
			return createJsonResponse({ success: false, message: 'Sheet not found', name: '' });
		}

		var cols = getColumnMap(sheet);
		var nameCol = findColumn(cols, ['Full Name', 'Fullname', 'Name', 'Complete Name']);
		var certIdCol = findColumn(cols, ['CERT_ID', 'Certificate ID']);
		var statusCol = findColumn(cols, ['STATUS', 'Status']);
		var scanTimeCol = findColumn(cols, ['SCAN_TIME', 'Scan Time']);
		var signoutTimeCol = findColumn(cols, [
			'SIGNOUT_TIME',
			'Signout Time',
			'Sign Out Time',
			'Checkout Time'
		]);
		var proofOfPaymentCol = findColumn(cols, [
			'Proof of Payment',
			'Upload',
			'Receipt',
			'Payment Proof',
			'Attachment',
			'proof of payment'
		]);

		if (certIdCol === -1 || statusCol === -1) {
			lock.releaseLock();
			return createJsonResponse({
				success: false,
				message: 'CERT_ID or STATUS column not found',
				name: ''
			});
		}

		// Ensure SIGNOUT_TIME column exists
		if (signoutTimeCol === -1) {
			signoutTimeCol = sheet.getLastColumn() + 1;
			sheet.getRange(1, signoutTimeCol).setValue('SIGNOUT_TIME');
			cols = getColumnMap(sheet);
		}

		// Re-read fresh data while holding the lock to avoid race conditions
		var values = sheet.getDataRange().getValues();
		var found = false;
		var message = '';
		var attendeeName = '';
		var attendeePayment = 'NOT PAID';
		var actionType = '';

		for (var i = 1; i < values.length; i++) {
			var rowCertId = String(values[i][certIdCol - 1] || '').trim();
			var rowName = nameCol > 0 ? String(values[i][nameCol - 1] || '').trim() : '';

			if (rowCertId && qrContent.includes(rowCertId)) {
				found = true;
				attendeeName = rowName;
				var rowPayment =
					proofOfPaymentCol > 0 ? String(values[i][proofOfPaymentCol - 1] || '').trim() : '';
				attendeePayment = rowPayment || 'NOT PAID';

				var currentStatus = String(values[i][statusCol - 1] || '').trim();
				var currentSignoutTime = signoutTimeCol > 0 ? values[i][signoutTimeCol - 1] : '';

				if (currentStatus === 'ATTENDED') {
					if (currentSignoutTime) {
						message = 'Already signed out: ' + rowName;
						actionType = 'already_signedout';
					} else {
						sheet.getRange(i + 1, signoutTimeCol).setValue(new Date());
						SpreadsheetApp.flush();
						message = 'Goodbye, ' + rowName + '! Signed out successfully.';
						actionType = 'signout';
						Logger.log('Marked SIGNED OUT: ' + rowName);
					}
				} else {
					sheet.getRange(i + 1, statusCol).setValue('ATTENDED');
					if (scanTimeCol > 0) {
						sheet.getRange(i + 1, scanTimeCol).setValue(new Date());
					}
					SpreadsheetApp.flush();
					message = 'Welcome, ' + rowName + '!';
					actionType = 'signin';
					Logger.log('Marked ATTENDED: ' + rowName);
				}
				break;
			}
		}

		if (!found) {
			message = 'QR Code not recognized';
			Logger.log('No match for: ' + qrContent);
		}

		lock.releaseLock();
		return createJsonResponse({
			success: found && (actionType === 'signin' || actionType === 'signout'),
			message: message,
			name: attendeeName,
			proofOfPayment: attendeePayment,
			actionType: actionType
		});
	} catch (error) {
		lock.releaseLock();
		Logger.log('Error: ' + error);
		return createJsonResponse({ success: false, message: 'Error: ' + error, name: '' });
	}
}

// ==========================================
//  SEND PROGRAM EMAIL
// ==========================================

function sendProgramEmail(name, email, config) {
	try {
		var eventName = config.EVENT_NAME || 'Event';
		var orgName = config.ORG_NAME || '';
		var primaryColor = config.PRIMARY_COLOR || '#800000';
		var accentColor = config.ACCENT_COLOR || '#FFD700';
		var programLink =
			'https://heyzine.com/flip-book/6d1b054fba.html?fbclid=IwY2xjawQPPiRleHRuA2FlbQIxMQBzcnRjBmFwcF9pZA80Mzc2MjYzMTY5NzM3ODgAAR6ZpCtccJiIeZYc-WANVhth3vWZt9PO3N-cgxslXlosKTyJyVsLUkeiPOydAw_aem_MGcXFcqWckRpZish4omGnw';

		var htmlBody =
			'<!DOCTYPE html><html><head>' +
			'<meta name="color-scheme" content="light dark">' +
			'<meta name="supported-color-schemes" content="light dark">' +
			'<meta name="viewport" content="width=device-width, initial-scale=1.0">' +
			'<style>' +
			':root { color-scheme: light dark; supported-color-schemes: light dark; } ' +
			'.darkmode-white { color: #fffffe !important; -webkit-text-fill-color: #fffffe !important; } ' +
			'.darkmode-dark { color: #333333 !important; -webkit-text-fill-color: #333333 !important; } ' +
			'.darkmode-gray { color: #555555 !important; -webkit-text-fill-color: #555555 !important; } ' +
			'.darkmode-bg { background-color: #fcfcfc !important; } ' +
			'.mobile-white { color: #ffffff !important; -webkit-text-fill-color: #ffffff !important; } ' +
			'@media only screen and (max-width: 600px) { ' +
			'  .responsive-padding { padding: 30px 20px !important; } ' +
			'  .mobile-black { color: #000000 !important; -webkit-text-fill-color: #000000 !important; text-shadow: none !important; mix-blend-mode: normal !important; text-align: center !important; } ' +
			'} ' +
			'@media (prefers-color-scheme: dark) { ' +
			'  .mobile-white { color: #ffffff !important; -webkit-text-fill-color: #ffffff !important; } ' +
			'} ' +
			'</style></head><body style="margin:0;padding:0;background-color:#f4f4f4;">' +
			'<div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto; padding: 30px 20px;">' +
			'<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: #ffffff; border: 1px solid #ddd; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">' +
			'<tr>' +
			'<td style="background: linear-gradient(135deg, ' +
			primaryColor +
			', #333); padding: 25px 30px; text-align: center;">' +
			'<h2 class="darkmode-white mobile-black" style="color: #ffffff; -webkit-text-fill-color: #ffffff; margin: 0; font-size: 24px; letter-spacing: 0.5px; text-align: center;">' +
			eventName +
			'</h2>' +
			(orgName
				? '<p class="darkmode-white mobile-black" style="color: #ffffff; -webkit-text-fill-color: #ffffff; margin: 8px 0 0 0; font-size: 14px; opacity: 0.95; text-align: center;">' +
					orgName +
					'</p>'
				: '') +
			'</td>' +
			'</tr>' +
			'<tr>' +
			'<td class="responsive-padding" style="padding: 40px 30px;">' +
			'<h3 class="darkmode-dark" style="color: #333333; margin-top: 0; font-size: 22px;">Event Program Available!</h3>' +
			'<p class="darkmode-gray" style="color: #555555; font-size: 15px; line-height: 1.6;">Hello <strong>' +
			name +
			'</strong>,</p>' +
			'<p class="darkmode-gray" style="color: #555555; font-size: 15px; line-height: 1.6;">The program for <strong>' +
			eventName +
			'</strong> is now available. Click the button below to view the full event program:</p>' +
			'<div style="text-align: center; margin: 30px 0;">' +
			'<a href="' +
			programLink +
			'" class="mobile-white" style="display: inline-block; background: linear-gradient(135deg, ' +
			primaryColor +
			', #333); color: #ffffff; -webkit-text-fill-color: #ffffff; text-decoration: none; padding: 15px 40px; border-radius: 8px; font-size: 16px; font-weight: bold; letter-spacing: 0.5px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); transition: all 0.3s;">View Event Program</a>' +
			'</div>' +
			'<p class="darkmode-gray" style="color: #888888; font-size: 13px; line-height: 1.6; margin-top: 25px; padding-top: 20px; border-top: 1px solid #eee;">Or copy this link: <a href="' +
			programLink +
			'" style="color: ' +
			primaryColor +
			'; word-break: break-all;">' +
			programLink +
			'</a></p>' +
			'</td>' +
			'</tr>' +
			'<tr>' +
			'<td style="background: linear-gradient(135deg, ' +
			primaryColor +
			', ' +
			primaryColor +
			'); padding: 15px 30px; text-align: center;">' +
			'<p class="darkmode-white mobile-black" style="color: #ffffff; -webkit-text-fill-color: #ffffff; margin: 0; font-size: 12px; opacity: 0.95; text-align: center;">' +
			eventName +
			'</p>' +
			'</td>' +
			'</tr>' +
			'</table>' +
			'</div></body></html>';

		GmailApp.sendEmail(email, 'Event Program - ' + eventName, '', {
			htmlBody: htmlBody,
			name: eventName
		});

		Logger.log('Program email sent to: ' + email);
		return { success: true, error: '' };
	} catch (err) {
		Logger.log('Program email error: ' + err);
		return { success: false, error: String(err) };
	}
}

// ==========================================
//  HELPER
// ==========================================

function createJsonResponse(data) {
	return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(
		ContentService.MimeType.JSON
	);
}

// ==========================================
//  SETUP - Run this ONCE on a new account
// ==========================================

function setup() {
	var ss = SpreadsheetApp.getActiveSpreadsheet();

	// Check if Settings already exists
	if (ss.getSheetByName('Settings')) {
		Logger.log('Settings tab already exists!');
		Logger.log('If you want to recreate it, delete the existing one first.');
		return;
	}

	// Auto-detect the response sheet name
	var sheets = ss.getSheets();
	var detectedTab = '';
	for (var i = 0; i < sheets.length; i++) {
		var sName = sheets[i].getName();
		if (
			sName.toLowerCase().indexOf('form response') !== -1 ||
			sName.toLowerCase().indexOf('form_response') !== -1
		) {
			detectedTab = sName;
			break;
		}
	}
	if (!detectedTab && sheets.length > 0) {
		detectedTab = sheets[0].getName();
	}

	// Create Settings sheet
	var settings = ss.insertSheet('Settings');

	var rows = [
		['Setting', 'Value'],
		['REG_SHEET_TAB', detectedTab],
		['EVENT_NAME', 'Your Event Name'],
		['EVENT_DATE', 'Event Date'],
		['EVENT_LOCATION', 'Event Location'],
		['ORG_NAME', 'Your Organization'],
		['PRIMARY_COLOR', '#800000'],
		['ACCENT_COLOR', '#FFD700']
	];

	settings.getRange(1, 1, rows.length, 2).setValues(rows);

	// Style header
	settings.getRange('A1:B1').setFontWeight('bold').setBackground('#333333').setFontColor('#FFFFFF');
	settings
		.getRange('A2:A' + rows.length)
		.setFontWeight('bold')
		.setBackground('#f5f5f5');
	settings.setColumnWidth(1, 180);
	settings.setColumnWidth(2, 350);

	// Add instructions
	settings.getRange('D1').setValue('INSTRUCTIONS');
	settings.getRange('D2').setValue('1. Fill in the values in Column B');
	settings.getRange('D3').setValue('2. REG_SHEET_TAB = the tab name where form responses go');
	settings.getRange('D4').setValue('3. Colors must be valid hex (e.g. #800000)');
	settings.getRange('D5').setValue('4. After filling in, run testSetup() to verify');
	settings.getRange('D1').setFontWeight('bold');
	settings.setColumnWidth(4, 400);

	Logger.log('=== SETUP COMPLETE ===');
	Logger.log('');
	Logger.log('Settings tab created!');
	Logger.log('Detected sheet tab: ' + detectedTab);
	Logger.log('');
	Logger.log('NEXT STEPS:');
	Logger.log('1. Go to the Settings tab');
	Logger.log('2. Fill in your Event Name, Date, Location, etc.');
	Logger.log('3. Run testSetup() to verify everything works');
	Logger.log('4. Set up the form trigger (see setupTrigger())');
}

// ==========================================
//  SETUP TRIGGER - Creates the form trigger
// ==========================================

function setupTrigger() {
	// Delete existing triggers for this function
	var triggers = ScriptApp.getProjectTriggers();
	for (var i = 0; i < triggers.length; i++) {
		if (triggers[i].getHandlerFunction() === 'onFormSubmit') {
			ScriptApp.deleteTrigger(triggers[i]);
		}
	}

	// Create new trigger
	ScriptApp.newTrigger('onFormSubmit')
		.forSpreadsheet(SpreadsheetApp.getActiveSpreadsheet())
		.onFormSubmit()
		.create();

	Logger.log('Trigger created: onFormSubmit will run when the form is submitted.');
}

// ==========================================
//  TEST FUNCTIONS
// ==========================================

function testSetup() {
	Logger.log('=== TESTING SETUP ===\n');

	// Test settings
	try {
		var config = getSettings();
		Logger.log('[OK] Settings loaded:');
		for (var key in config) {
			Logger.log('   ' + key + ' = ' + config[key]);
		}
	} catch (err) {
		Logger.log('[ERROR] ' + err);
		Logger.log('Run setup() first!');
		return;
	}

	// Test sheet access
	var ss = SpreadsheetApp.getActiveSpreadsheet();
	var sheetTab = config.REG_SHEET_TAB;
	var sheet = ss.getSheetByName(sheetTab);

	if (sheet) {
		Logger.log('\n[OK] Sheet found: ' + sheetTab);
		Logger.log('   Rows: ' + sheet.getLastRow());
		Logger.log('   Columns: ' + sheet.getLastColumn());

		var cols = getColumnMap(sheet);
		Logger.log('\n   Column Map:');
		for (var header in cols) {
			Logger.log('   Col ' + cols[header] + ': ' + header);
		}

		var nameCol = findColumn(cols, ['Full Name', 'Fullname', 'Name', 'Complete Name']);
		var emailCol = findColumn(cols, ['Email Address', 'Email']);
		Logger.log('\n   Name column: ' + (nameCol > 0 ? 'Col ' + nameCol + ' [OK]' : '[NOT FOUND]'));
		Logger.log('   Email column: ' + (emailCol > 0 ? 'Col ' + emailCol + ' [OK]' : '[NOT FOUND]'));
	} else {
		Logger.log("\n[ERROR] Sheet '" + sheetTab + "' not found!");
		Logger.log('Available sheets:');
		ss.getSheets().forEach(function (s, i) {
			Logger.log('   ' + (i + 1) + '. ' + s.getName());
		});
	}

	// Test triggers
	var triggers = ScriptApp.getProjectTriggers();
	Logger.log('\nTriggers: ' + triggers.length);
	triggers.forEach(function (t, i) {
		Logger.log('   ' + (i + 1) + '. ' + t.getHandlerFunction() + ' (' + t.getEventType() + ')');
	});

	Logger.log('\n=== TEST COMPLETE ===');
}

function testScan() {
	Logger.log('=== TEST SCAN ===\n');

	var config = getSettings();
	var ss = SpreadsheetApp.getActiveSpreadsheet();
	var sheet = ss.getSheetByName(config.REG_SHEET_TAB);

	if (!sheet) {
		Logger.log('Sheet not found!');
		return;
	}

	var cols = getColumnMap(sheet);
	var certIdCol = findColumn(cols, ['CERT_ID', 'Certificate ID']);

	if (certIdCol === -1) {
		Logger.log('No CERT_ID column yet. Submit a form first or run a test registration.');
		return;
	}

	// Find first row with a cert ID
	var values = sheet.getDataRange().getValues();
	var testCertId = '';
	var testName = '';

	for (var i = 1; i < values.length; i++) {
		var id = String(values[i][certIdCol - 1] || '').trim();
		if (id) {
			testCertId = id;
			var nameCol = findColumn(cols, ['Full Name', 'Fullname', 'Name']);
			testName = nameCol > 0 ? String(values[i][nameCol - 1] || '').trim() : '';
			break;
		}
	}

	if (!testCertId) {
		Logger.log('No registered users with CERT_ID found. Submit the form first.');
		return;
	}

	Logger.log('Testing scan for: ' + testName + ' (' + testCertId + ')');

	var testData = {
		postData: { contents: JSON.stringify({ qrContent: testName + ' | ' + testCertId }) }
	};

	var result = doPost(testData);
	Logger.log('Result: ' + result.getContent());
}

function listSheets() {
	var ss = SpreadsheetApp.getActiveSpreadsheet();
	Logger.log('All sheets in this spreadsheet:');
	ss.getSheets().forEach(function (s, i) {
		Logger.log('   ' + (i + 1) + ". '" + s.getName() + "' (" + s.getLastRow() + ' rows)');
	});
}

// ==========================================
//  STRESS TEST - 1000 Registration Emails
// ==========================================
// Run stressTestStart() to begin
// Run stressTestStatus() to check progress
// Run stressTestStop() to cancel

var BATCH_SIZE = 45; // emails per batch (fits in 6-min limit)
var BATCH_DELAY = 1; // minutes between batches (must be 1, 5, 10, 15, or 30)

function stressTestStart() {
	var config = getSettings();
	var testEmail = Session.getActiveUser().getEmail();
	var totalEmails = 1000;

	// Check daily quota remaining
	var remaining = MailApp.getRemainingDailyQuota();
	Logger.log('=== STRESS TEST SETUP ===');
	Logger.log('Test email: ' + testEmail);
	Logger.log('Target: ' + totalEmails + ' emails');
	Logger.log('Daily quota remaining: ' + remaining);
	Logger.log('Batch size: ' + BATCH_SIZE);
	Logger.log('Event: ' + (config.EVENT_NAME || 'Event'));

	if (remaining < 10) {
		Logger.log('ERROR: Daily email quota too low (' + remaining + '). Try again tomorrow.');
		return;
	}

	// Cap at remaining quota
	if (totalEmails > remaining) {
		totalEmails = remaining;
		Logger.log('WARNING: Capped at ' + totalEmails + ' (daily quota limit)');
	}

	// Create or reset tracking sheet
	var ss = SpreadsheetApp.getActiveSpreadsheet();
	var trackSheet = ss.getSheetByName('StressTest');
	if (trackSheet) ss.deleteSheet(trackSheet);
	trackSheet = ss.insertSheet('StressTest');
	trackSheet
		.getRange('A1:F1')
		.setValues([['#', 'Name', 'CertID', 'Status', 'Time', 'Duration (ms)']]);
	trackSheet.getRange('A1:F1').setFontWeight('bold');

	// Store test state in Properties
	var props = PropertiesService.getScriptProperties();
	props.setProperties({
		STRESS_TOTAL: String(totalEmails),
		STRESS_SENT: '0',
		STRESS_FAILED: '0',
		STRESS_EMAIL: testEmail,
		STRESS_START: new Date().toISOString(),
		STRESS_RUNNING: 'true'
	});

	Logger.log('Starting first batch...');
	stressTestBatch();

	// Schedule next batches
	if (totalEmails > BATCH_SIZE) {
		ScriptApp.newTrigger('stressTestBatch').timeBased().everyMinutes(BATCH_DELAY).create();
		Logger.log('Auto-batch trigger created (every ' + BATCH_DELAY + ' min)');
	}

	Logger.log('=== TEST STARTED ===');
}

function stressTestBatch() {
	var props = PropertiesService.getScriptProperties();

	if (props.getProperty('STRESS_RUNNING') !== 'true') {
		Logger.log('Stress test not running. Use stressTestStart().');
		return;
	}

	var total = parseInt(props.getProperty('STRESS_TOTAL') || '0');
	var sent = parseInt(props.getProperty('STRESS_SENT') || '0');
	var failed = parseInt(props.getProperty('STRESS_FAILED') || '0');
	var testEmail = props.getProperty('STRESS_EMAIL');

	if (sent + failed >= total) {
		Logger.log('Test complete! Sent: ' + sent + ', Failed: ' + failed);
		stressTestStop();
		return;
	}

	var config = getSettings();
	var eventName = config.EVENT_NAME || 'Event';
	var orgName = config.ORG_NAME || '';
	var primaryColor = config.PRIMARY_COLOR || '#800000';

	var ss = SpreadsheetApp.getActiveSpreadsheet();
	var trackSheet = ss.getSheetByName('StressTest');

	var batchStart = sent + failed;
	var batchEnd = Math.min(batchStart + BATCH_SIZE, total);
	var batchSent = 0;
	var batchFailed = 0;

	Logger.log('=== BATCH: ' + (batchStart + 1) + ' to ' + batchEnd + ' of ' + total + ' ===');

	for (var i = batchStart; i < batchEnd; i++) {
		var num = i + 1;
		var testName = 'Test User ' + num;
		var certId = 'TEST-' + Utilities.getUuid().slice(0, 8).toUpperCase();
		var startTime = new Date().getTime();

		try {
			// Generate QR code
			var qrUrl =
				'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=' +
				encodeURIComponent(testName + ' | ' + certId);

			// Build email HTML (same as real registration email)
			var htmlBody =
				'<!DOCTYPE html><html><head>' +
				'<meta name="color-scheme" content="light dark">' +
				'<meta name="supported-color-schemes" content="light dark">' +
				'<meta name="viewport" content="width=device-width, initial-scale=1.0">' +
				'<style>' +
				':root { color-scheme: light dark; supported-color-schemes: light dark; } ' +
				'.darkmode-white { color: #fffffe !important; -webkit-text-fill-color: #fffffe !important; } ' +
				'.darkmode-dark { color: #333333 !important; -webkit-text-fill-color: #333333 !important; } ' +
				'.darkmode-gray { color: #555555 !important; -webkit-text-fill-color: #555555 !important; } ' +
				'.darkmode-bg { background-color: #fcfcfc !important; } ' +
				'@media only screen and (max-width: 600px) { ' +
				'  .responsive-td { display: block !important; width: 100% !important; border-left: none !important; border-top: 1px solid #eeeeee !important; padding: 30px 20px !important; box-sizing: border-box !important; } ' +
				'  .responsive-td-left { padding: 30px 20px !important; box-sizing: border-box !important; } ' +
				'  .mobile-black { color: #000000 !important; -webkit-text-fill-color: #000000 !important; text-shadow: none !important; mix-blend-mode: normal !important; text-align: center !important; } ' +
				'} ' +
				'</style></head><body style="margin:0;padding:0;background-color:#f4f4f4;">' +
				'<div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto; padding: 30px 20px;">' +
				'<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: #ffffff; border: 1px solid #ddd; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">' +
				'<tr>' +
				'<td colspan="2" style="background: linear-gradient(135deg, ' +
				primaryColor +
				', #333); padding: 25px 30px; text-align: center;">' +
				'<h2 class="darkmode-white mobile-black" style="color: #ffffff; -webkit-text-fill-color: #ffffff; margin: 0; font-size: 24px; letter-spacing: 0.5px; text-align: center;">' +
				eventName +
				'</h2>' +
				(orgName
					? '<p class="darkmode-white mobile-black" style="color: #ffffff; -webkit-text-fill-color: #ffffff; margin: 8px 0 0 0; font-size: 14px; opacity: 0.95; text-align: center;">' +
						orgName +
						'</p>'
					: '') +
				'</td>' +
				'</tr>' +
				'<tr>' +
				'<td width="55%" class="responsive-td responsive-td-left" style="padding: 40px 30px; vertical-align: middle;">' +
				'<h3 class="darkmode-dark" style="color: #333333; margin-top: 0; font-size: 22px;">Registration Confirmed!</h3>' +
				'<p class="darkmode-gray" style="color: #555555; font-size: 15px; line-height: 1.6;">Hello <strong>' +
				testName +
				'</strong>,</p>' +
				'<p class="darkmode-gray" style="color: #555555; font-size: 15px; line-height: 1.6;">You are successfully registered. Please present the QR code at the entrance of the event for quick check-in.</p>' +
				'<div style="margin-top: 25px; padding-top: 20px; border-top: 1px solid #eee; text-align: center;">' +
				'<table width="100%" cellpadding="0" cellspacing="0" border="0" style="table-layout: fixed; margin: 0 auto;">' +
				'<tr>' +
				'<td width="50%" align="center" style="padding-bottom: 4px; text-align: center;"><strong class="darkmode-dark" style="color:#333; font-size:12px; text-transform:uppercase; letter-spacing:0.5px;">Attendee</strong></td>' +
				'<td width="50%" align="center" style="padding-bottom: 4px; text-align: center;"><strong class="darkmode-dark" style="color:#333; font-size:12px; text-transform:uppercase; letter-spacing:0.5px;">Certificate ID</strong></td>' +
				'</tr>' +
				'<tr>' +
				'<td align="center" style="padding-top: 4px; text-align: center; vertical-align: top;"><span class="darkmode-gray" style="color:#555; font-size:15px; word-break: break-word;">' +
				testName +
				'</span></td>' +
				'<td align="center" style="padding-top: 4px; text-align: center; vertical-align: top;"><span class="darkmode-gray" style="color:#555; font-size:15px; word-break: break-all;">' +
				certId +
				'</span></td>' +
				'</tr>' +
				'</table>' +
				'</div>' +
				'</td>' +
				'<td width="45%" class="darkmode-bg responsive-td" style="padding: 40px 30px; text-align: center; vertical-align: middle; background-color: #fcfcfc; border-left: 1px solid #eeeeee;">' +
				'<div style="background: #ffffff; padding: 15px; display: inline-block; border-radius: 12px; border: 1px solid #ddd; box-shadow: 0 4px 10px rgba(0,0,0,0.03);">' +
				'<img src="' +
				qrUrl +
				'" width="180" height="180" style="margin: 0; display: block;" alt="QR Code" />' +
				'</div>' +
				'<p class="darkmode-gray" style="color: #888888; font-size: 12px; margin-top: 15px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.5px;">Ready to Scan</p>' +
				'</td>' +
				'</tr>' +
				'<tr>' +
				'<td colspan="2" style="background: linear-gradient(135deg, ' +
				primaryColor +
				', ' +
				primaryColor +
				'); padding: 15px 30px; text-align: center;">' +
				'<p class="darkmode-white mobile-black" style="color: #ffffff; -webkit-text-fill-color: #ffffff; margin: 0; font-size: 12px; opacity: 0.95; text-align: center;">[STRESS TEST ' +
				num +
				'/' +
				total +
				'] ' +
				eventName +
				'</p>' +
				'</td>' +
				'</tr>' +
				'</table>' +
				'</div></body></html>';

			GmailApp.sendEmail(testEmail, '[TEST ' + num + '/' + total + '] QR Code - ' + eventName, '', {
				htmlBody: htmlBody,
				name: eventName + ' (Stress Test)'
			});

			var duration = new Date().getTime() - startTime;
			trackSheet.appendRow([num, testName, certId, 'SENT', new Date().toLocaleString(), duration]);
			batchSent++;
			sent++;
			Logger.log('✓ ' + num + '/' + total + ' sent (' + duration + 'ms)');
		} catch (err) {
			var duration = new Date().getTime() - startTime;
			trackSheet.appendRow([
				num,
				testName,
				certId,
				'FAILED: ' + err,
				new Date().toLocaleString(),
				duration
			]);
			batchFailed++;
			failed++;
			Logger.log('✗ ' + num + '/' + total + ' FAILED: ' + err);

			// If quota exceeded, stop
			if (String(err).indexOf('quota') !== -1 || String(err).indexOf('limit') !== -1) {
				Logger.log('QUOTA HIT - stopping test');
				props.setProperty('STRESS_SENT', String(sent));
				props.setProperty('STRESS_FAILED', String(failed));
				stressTestStop();
				return;
			}
		}
	}

	// Update progress
	props.setProperty('STRESS_SENT', String(sent));
	props.setProperty('STRESS_FAILED', String(failed));

	var remaining = total - sent - failed;
	Logger.log('Batch done. Sent: ' + batchSent + ', Failed: ' + batchFailed);
	Logger.log('Total progress: ' + (sent + failed) + '/' + total + ' (' + remaining + ' remaining)');
	Logger.log('Quota remaining: ' + MailApp.getRemainingDailyQuota());

	if (remaining <= 0) {
		Logger.log('=== STRESS TEST COMPLETE ===');
		stressTestStop();
	}
}

function stressTestStatus() {
	var props = PropertiesService.getScriptProperties();
	var running = props.getProperty('STRESS_RUNNING') === 'true';
	var total = props.getProperty('STRESS_TOTAL') || '0';
	var sent = props.getProperty('STRESS_SENT') || '0';
	var failed = props.getProperty('STRESS_FAILED') || '0';
	var startTime = props.getProperty('STRESS_START') || '';
	var email = props.getProperty('STRESS_EMAIL') || '';

	Logger.log('=== STRESS TEST STATUS ===');
	Logger.log('Running: ' + running);
	Logger.log('Target: ' + total);
	Logger.log('Sent: ' + sent);
	Logger.log('Failed: ' + failed);
	Logger.log('Remaining: ' + (parseInt(total) - parseInt(sent) - parseInt(failed)));
	Logger.log('Test email: ' + email);
	Logger.log('Started: ' + startTime);
	Logger.log('Email quota remaining: ' + MailApp.getRemainingDailyQuota());
}

function stressTestStop() {
	// Remove batch triggers
	var triggers = ScriptApp.getProjectTriggers();
	for (var i = 0; i < triggers.length; i++) {
		if (triggers[i].getHandlerFunction() === 'stressTestBatch') {
			ScriptApp.deleteTrigger(triggers[i]);
		}
	}

	var props = PropertiesService.getScriptProperties();
	props.setProperty('STRESS_RUNNING', 'false');

	var sent = props.getProperty('STRESS_SENT') || '0';
	var failed = props.getProperty('STRESS_FAILED') || '0';
	var total = props.getProperty('STRESS_TOTAL') || '0';

	Logger.log('=== STRESS TEST STOPPED ===');
	Logger.log('Final: ' + sent + ' sent, ' + failed + ' failed out of ' + total);
	Logger.log("Results saved in 'StressTest' sheet tab");
}

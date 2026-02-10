import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const APPS_SCRIPT_URL =
	'https://script.google.com/macros/s/AKfycbz5QiyezJOEuyoz5YLQaM_TOpS2WbBO-fLdZS_6hMSZI8n282ivHg85rUCYpNEGG_qn/exec';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json();
		const qrContent = body.qrContent || body.certId;

		const response = await fetch(APPS_SCRIPT_URL, {
			method: 'POST',
			redirect: 'follow',
			headers: { 'Content-Type': 'text/plain' },
			body: JSON.stringify({ qrContent })
		});

		const text = await response.text();

		if (text.startsWith('<!DOCTYPE') || text.startsWith('<html')) {
			console.error('Apps Script returned HTML instead of JSON:', text.substring(0, 200));
			return json({ success: false, message: 'Apps Script error. Please redeploy the script.' }, { status: 502 });
		}

		const data = JSON.parse(text);
		return json(data);
	} catch (error) {
		console.error('Failed to mark attendance:', error);
		return json({ success: false, message: 'Failed to mark attendance' }, { status: 500 });
	}
};

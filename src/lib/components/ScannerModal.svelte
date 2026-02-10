<script lang="ts">
	import { browser } from '$app/environment';

	let {
		open = $bindable(false),
		onSuccess = () => {},
		onClose = () => {}
	}: {
		open?: boolean;
		onSuccess?: () => void;
		onClose?: () => void;
	} = $props();

	let html5Qrcode: any = null;
	let scannerStatus = $state<'scanning' | 'success' | 'error'>('scanning');
	let statusText = $state('Point camera at a QR code');
	let resultTitle = $state('');
	let resultMessage = $state('');
	let showResult = $state(false);
	let cameraActive = $state(false);

	async function startCamera() {
		if (!browser) return;
		try {
			const { Html5Qrcode } = await import('html5-qrcode');
			html5Qrcode = new Html5Qrcode('reader');
			await html5Qrcode.start(
				{ facingMode: 'environment' },
				{ fps: 10, qrbox: { width: 250, height: 250 } },
				onScanSuccess,
				() => {}
			);
			cameraActive = true;
			scannerStatus = 'scanning';
			statusText = 'Point camera at a QR code';
			showResult = false;
		} catch (err) {
			console.error('Camera start error:', err);
			statusText = 'Camera access denied';
			scannerStatus = 'error';
		}
	}

	async function stopCamera() {
		if (html5Qrcode && cameraActive) {
			try {
				await html5Qrcode.stop();
			} catch {
				// ignore stop errors
			}
			cameraActive = false;
		}
	}

	async function onScanSuccess(decodedText: string) {
		await stopCamera();
		scannerStatus = 'scanning';
		statusText = 'Sending data...';

		try {
			await fetch('/api/mark-attendance', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ qrContent: decodedText })
			});

			scannerStatus = 'success';
			statusText = 'Scan successful!';
			resultTitle = 'Attendance Recorded';
			resultMessage = decodedText;
			showResult = true;

			// Increment scan count
			if (browser) {
				const count = parseInt(localStorage.getItem('scanCount') || '0') + 1;
				localStorage.setItem('scanCount', String(count));
			}

			// Reload guests after delay
			setTimeout(() => {
				onSuccess();
			}, 1000);
		} catch (err) {
			scannerStatus = 'error';
			statusText = 'Scan failed';
			resultTitle = 'Error';
			resultMessage = String(err);
			showResult = true;
		}
	}

	async function handleClose() {
		await stopCamera();
		open = false;
		onClose();
	}

	async function scanAnother() {
		showResult = false;
		scannerStatus = 'scanning';
		statusText = 'Point camera at a QR code';
		resultTitle = '';
		resultMessage = '';
		await startCamera();
	}

	$effect(() => {
		if (open && browser) {
			// Small delay to ensure DOM is ready
			setTimeout(() => startCamera(), 100);
		}
	});
</script>

{#if open}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="backdrop" class:visible={open} onclick={handleClose}></div>
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="modal" class:visible={open} onclick={(e) => e.stopPropagation()}>
		<div class="modal-header">
			<h2>QR Code Scanner</h2>
			<button class="close-btn" onclick={handleClose} aria-label="Close scanner">
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
					<line x1="18" y1="6" x2="6" y2="18"/>
					<line x1="6" y1="6" x2="18" y2="18"/>
				</svg>
			</button>
		</div>

		<div class="camera-area">
			<div id="reader"></div>
			<!-- QR Focus Overlay -->
			<div class="scan-overlay">
				<div class="scan-mask-top"></div>
				<div class="scan-middle">
					<div class="scan-mask-side"></div>
					<div class="scan-focus">
						<div class="corner tl"></div>
						<div class="corner tr"></div>
						<div class="corner bl"></div>
						<div class="corner br"></div>
						<div class="scan-line"></div>
					</div>
					<div class="scan-mask-side"></div>
				</div>
				<div class="scan-mask-bottom"></div>
			</div>
		</div>

		<div class="controls">
			<div class="status-bar">
				<span class="status-dot {scannerStatus}"></span>
				<span class="status-text">{statusText}</span>
			</div>

			{#if showResult}
				<div class="result-row {scannerStatus}">
					<span class="result-emoji">{scannerStatus === 'success' ? '✅' : '❌'}</span>
					<div class="result-info">
						<div class="result-title">{resultTitle}</div>
						<div class="result-message">{resultMessage}</div>
					</div>
				</div>
			{/if}

			<div class="action-buttons">
				{#if showResult}
					<button class="btn-scan-another" onclick={scanAnother}>Scan Another</button>
				{/if}
				<button class="btn-cancel" onclick={handleClose}>Cancel</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.7);
		z-index: 200;
		opacity: 0;
		visibility: hidden;
		transition: opacity 0.25s ease, visibility 0.25s ease;
	}

	.backdrop.visible {
		opacity: 1;
		visibility: visible;
	}

	.modal {
		position: fixed;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%) scale(0.92);
		max-width: 360px;
		width: calc(100% - 32px);
		background: #800000;
		border-radius: 20px;
		z-index: 201;
		overflow: hidden;
		opacity: 0;
		visibility: hidden;
		transition: opacity 0.25s ease, visibility 0.25s ease, transform 0.25s ease;
	}

	.modal.visible {
		opacity: 1;
		visibility: visible;
		transform: translate(-50%, -50%) scale(1);
	}

	.modal-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 18px 20px;
	}

	.modal-header h2 {
		color: white;
		font-size: 15px;
		font-weight: 700;
		margin: 0;
	}

	.close-btn {
		width: 32px;
		height: 32px;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.12);
		border: none;
		color: white;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		transition: background 0.2s;
	}

	.close-btn:hover {
		background: rgba(255, 255, 255, 0.2);
	}

	.camera-area {
		position: relative;
		width: calc(100% - 32px);
		aspect-ratio: 1;
		background: #000;
		margin: 0 auto;
		border-radius: 12px;
		overflow: hidden;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	/* Force the html5-qrcode container to fill the camera area */
	:global(#reader) {
		position: absolute !important;
		inset: 0 !important;
		width: 100% !important;
		height: 100% !important;
		display: flex !important;
		align-items: center !important;
		justify-content: center !important;
	}

	/* Force scan region to fill and center */
	:global(#reader__scan_region) {
		position: absolute !important;
		inset: 0 !important;
		width: 100% !important;
		height: 100% !important;
		min-height: 100% !important;
		background: transparent !important;
		display: flex !important;
		align-items: center !important;
		justify-content: center !important;
	}

	/* Center and cover with the video feed */
	:global(#reader video) {
		position: absolute !important;
		top: 50% !important;
		left: 50% !important;
		transform: translate(-50%, -50%) !important;
		min-width: 100% !important;
		min-height: 100% !important;
		width: auto !important;
		height: auto !important;
		object-fit: cover !important;
	}

	:global(#reader__dashboard) {
		display: none !important;
	}

	:global(#reader__scan_region img) {
		display: none !important;
	}

	/* Hide ALL built-in qr shaded regions and borders from html5-qrcode */
	:global(#reader__scan_region video ~ div) {
		display: none !important;
	}

	:global(#reader__scan_region > div) {
		opacity: 0 !important;
		display: none !important;
	}

	:global(#reader > div:not(#reader__scan_region):not(#reader__dashboard)) {
		display: none !important;
	}

	/* Hide any canvas or shading the library creates */
	:global(#reader canvas) {
		display: none !important;
	}

	:global(#qr-shaded-region) {
		display: none !important;
	}

	/* === QR Focus Overlay === */
	.scan-overlay {
		position: absolute;
		inset: 0;
		display: flex;
		flex-direction: column;
		pointer-events: none;
		z-index: 2;
	}

	.scan-mask-top,
	.scan-mask-bottom {
		flex: 1;
		background: rgba(0, 0, 0, 0.5);
	}

	.scan-middle {
		display: flex;
		height: 72%;
	}

	.scan-mask-side {
		flex: 1;
		background: rgba(0, 0, 0, 0.5);
	}

	.scan-focus {
		position: relative;
		width: 88%;
		aspect-ratio: 1;
	}

	/* Corner brackets */
	.corner {
		position: absolute;
		width: 32px;
		height: 32px;
		border-color: #fff;
		border-style: solid;
		border-width: 0;
	}

	.corner.tl {
		top: 0; left: 0;
		border-top-width: 3px;
		border-left-width: 3px;
		border-top-left-radius: 6px;
	}

	.corner.tr {
		top: 0; right: 0;
		border-top-width: 3px;
		border-right-width: 3px;
		border-top-right-radius: 6px;
	}

	.corner.bl {
		bottom: 0; left: 0;
		border-bottom-width: 3px;
		border-left-width: 3px;
		border-bottom-left-radius: 6px;
	}

	.corner.br {
		bottom: 0; right: 0;
		border-bottom-width: 3px;
		border-right-width: 3px;
		border-bottom-right-radius: 6px;
	}

	/* Animated scan line */
	.scan-line {
		position: absolute;
		left: 4px;
		right: 4px;
		height: 2px;
		background: linear-gradient(90deg, transparent, rgba(128, 0, 0, 0.9), transparent);
		box-shadow: 0 0 8px rgba(128, 0, 0, 0.5);
		animation: scanLine 2.5s ease-in-out infinite;
	}

	@keyframes scanLine {
		0%, 100% { top: 8px; opacity: 0.6; }
		50% { top: calc(100% - 10px); opacity: 1; }
	}

	.controls {
		padding: 16px;
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.status-bar {
		background: #ffffff;
		border-radius: 10px;
		padding: 12px 16px;
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.status-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		flex-shrink: 0;
	}

	.status-dot.scanning {
		background: #22c55e;
		animation: pulse-dot 1.5s ease-in-out infinite;
	}

	.status-dot.success {
		background: #4ade80;
	}

	.status-dot.error {
		background: #ef4444;
	}

	.status-text {
		color: #800000;
		font-size: 13px;
		font-weight: 500;
	}

	.result-row {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 14px 16px;
		border-radius: 12px;
	}

	.result-row.success {
		background: rgba(34, 197, 94, 0.15);
		border: 1px solid rgba(34, 197, 94, 0.3);
	}

	.result-row.error {
		background: rgba(239, 68, 68, 0.15);
		border: 1px solid rgba(239, 68, 68, 0.3);
	}

	.result-emoji {
		font-size: 28px;
		flex-shrink: 0;
	}

	.result-info {
		min-width: 0;
	}

	.result-title {
		color: white;
		font-size: 14px;
		font-weight: 700;
	}

	.result-message {
		color: rgba(255, 255, 255, 0.5);
		font-size: 12px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.action-buttons {
		display: flex;
		gap: 10px;
	}

	.btn-scan-another {
		flex: 1;
		background: rgba(255, 255, 255, 0.2);
		border: 1px solid rgba(255, 255, 255, 0.4);
		color: white;
		padding: 12px;
		border-radius: 12px;
		font-family: 'Inter', sans-serif;
		font-size: 14px;
		font-weight: 700;
		cursor: pointer;
		transition: background 0.2s;
	}

	.btn-scan-another:hover {
		background: rgba(255, 255, 255, 0.3);
	}

	.btn-cancel {
		flex: 1;
		background: rgba(0, 0, 0, 0.15);
		border: none;
		color: rgba(255, 255, 255, 0.7);
		padding: 12px;
		border-radius: 12px;
		font-family: 'Inter', sans-serif;
		font-size: 14px;
		font-weight: 700;
		cursor: pointer;
		transition: background 0.2s;
	}

	.btn-cancel:hover {
		background: rgba(0, 0, 0, 0.25);
	}

	@keyframes pulse-dot {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.3; }
	}
</style>

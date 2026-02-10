<script lang="ts">
	let { onScanClick }: { onScanClick: () => void } = $props();
</script>

<div class="dock-outer">
	<div class="dock-inner">
		<div class="dock-slot"></div>
		<button class="dock-qr-btn" onclick={onScanClick} aria-label="Scan QR Code">
			<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<path d="M7 3H3v4"/>
				<path d="M17 3h4v4"/>
				<path d="M21 17v4h-4"/>
				<path d="M3 17v4h4"/>
				<rect x="9" y="9" width="6" height="6" rx="1"/>
			</svg>
		</button>
		<div class="dock-slot"></div>
	</div>
</div>

<style>
	.dock-outer {
		position: fixed;
		bottom: 12px;
		left: 10px;
		right: 10px;
		z-index: 50;
		pointer-events: none;
	}

	.dock-inner {
		background: #800000;
		border-radius: 18px;
		max-width: 1100px;
		margin: 0 auto;
		padding: 10px 20px;
		box-shadow: 0 8px 32px rgba(128, 0, 0, 0.25), 0 2px 8px rgba(0, 0, 0, 0.1);
		display: flex;
		align-items: center;
		pointer-events: auto;
	}

	.dock-slot {
		flex: 1;
	}

	.dock-qr-btn {
		width: 56px;
		height: 56px;
		border-radius: 50%;
		border: 3px solid #ffffff;
		background: #800000;
		color: white;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		margin-top: -30px;
		box-shadow: 0 4px 16px rgba(128, 0, 0, 0.3), 0 0 0 4px #800000;
		transition: transform 0.15s ease, background 0.15s ease;
	}

	.dock-qr-btn:active {
		transform: scale(0.9);
		background: #5c0000;
	}

	@media (min-width: 768px) {
		.dock-outer {
			display: none;
		}
	}
</style>

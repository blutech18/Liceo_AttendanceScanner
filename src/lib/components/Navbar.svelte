<script lang="ts">
	let {
		scanCount = 0,
		sidebarCollapsed = false,
		onScanClick = () => {}
	}: { scanCount?: number; sidebarCollapsed?: boolean; onScanClick?: () => void } = $props();
</script>

<header class="navbar">
	<div
		class="navbar-inner"
		class:sidebar-expanded={!sidebarCollapsed}
		class:sidebar-collapsed={sidebarCollapsed}
	>
		<div class="nav-left">
			<div class="nav-logo">
				<svg width="20" height="20" viewBox="0 0 24 24" fill="white">
					<path
						d="M3 11h2v2H3v-2zm4-4h2v2H7V7zm0 8h2v2H7v-2zm-4 0h2v2H3v-2zm0-8h2v2H3V7zm8-4h2v10h-2V3zm8 0h2v2h-2V3zM7 3h2v2H7V3zM3 3h2v2H3V3zm16 0h2v2h-2V3zm0 8h2v2h-2v-2zm0 8h2v2h-2v-2zm-4-4h2v6h-2v-6zm-4 2h2v4h-2v-4zm-4 0h2v4H7v-4zm12-6h2v2h-2v-2zm-8 0h2v2h-2v-2z"
					/>
				</svg>
			</div>
		</div>

		<div class="nav-center">
			<h1 class="nav-title">Event Entry Scanner</h1>
		</div>

		<div class="nav-right">
			<div class="scan-badge">
				<span class="badge-number">{scanCount}</span>
				<span class="badge-label">scans</span>
			</div>
			<button class="scan-btn-desktop" onclick={onScanClick}>
				<svg width="16" height="16" viewBox="0 0 24 24" fill="white">
					<path
						d="M3 11h2v2H3v-2zm4-4h2v2H7V7zm0 8h2v2H7v-2zm-4 0h2v2H3v-2zm0-8h2v2H3V7zm8-4h2v10h-2V3zm8 0h2v2h-2V3zM7 3h2v2H7V3zM3 3h2v2H3V3zm16 0h2v2h-2V3zm0 8h2v2h-2v-2zm0 8h2v2h-2v-2zm-4-4h2v6h-2v-6zm-4 2h2v4h-2v-4zm-4 0h2v4H7v-4zm12-6h2v2h-2v-2zm-8 0h2v2h-2v-2z"
					/>
				</svg>
				Scan QR
			</button>
		</div>
	</div>
</header>

<style>
	.navbar {
		position: sticky;
		top: 0;
		z-index: 50;
		background: #800000;
	}

	.navbar-inner {
		display: flex;
		align-items: center;
		justify-content: space-between;
		max-width: 1100px;
		margin: 0 auto;
		padding: 10px 14px;
		transition: max-width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
	}

	.nav-left {
		display: flex;
		align-items: center;
	}

	.nav-logo {
		width: 34px;
		height: 34px;
		background: rgba(255, 255, 255, 0.2);
		border-radius: 8px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.nav-center {
		flex: 1;
		text-align: center;
	}

	.nav-title {
		color: white;
		font-size: 15px;
		font-weight: 700;
		margin: 0;
	}

	.nav-right {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.scan-badge {
		display: flex;
		flex-direction: column;
		align-items: center;
		line-height: 1;
	}

	.badge-number {
		color: white;
		font-size: 16px;
		font-weight: 700;
	}

	.badge-label {
		color: rgba(255, 255, 255, 0.7);
		font-size: 10px;
		font-weight: 500;
	}

	.scan-btn-desktop {
		display: none;
		align-items: center;
		gap: 8px;
		background: rgba(255, 255, 255, 0.2);
		border: 1px solid rgba(255, 255, 255, 0.3);
		border-radius: 10px;
		color: white;
		font-family: 'Inter', sans-serif;
		font-size: 14px;
		font-weight: 600;
		padding: 10px 18px;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.scan-btn-desktop:hover {
		background: rgba(255, 255, 255, 0.3);
		transform: translateY(-1px);
	}

	@media (min-width: 480px) {
		.navbar-inner {
			padding: 12px 20px;
		}
		.nav-logo {
			width: 38px;
			height: 38px;
		}
		.nav-title {
			font-size: 17px;
		}
	}

	@media (min-width: 768px) {
		.navbar-inner {
			padding: 14px 24px;
		}
		.nav-logo {
			width: 42px;
			height: 42px;
			border-radius: 10px;
		}
		.nav-title {
			font-size: 19px;
		}
		.scan-btn-desktop {
			display: flex;
		}
		.navbar-inner.sidebar-expanded {
			max-width: 1400px;
		}
		.navbar-inner.sidebar-collapsed {
			max-width: 1600px;
		}
	}
</style>

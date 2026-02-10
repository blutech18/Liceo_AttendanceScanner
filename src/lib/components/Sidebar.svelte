<script lang="ts">
	import { browser } from '$app/environment';

	let { collapsed = $bindable(false) } = $props();

	function toggle() {
		collapsed = !collapsed;
		if (browser) {
			localStorage.setItem('sidebarCollapsed', String(collapsed));
		}
	}

	function expand() {
		if (collapsed) {
			collapsed = false;
			if (browser) {
				localStorage.setItem('sidebarCollapsed', 'false');
			}
		}
	}
</script>

<aside class="sidebar" class:collapsed>
	<div class="sidebar-header">
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="logo-icon" onclick={collapsed ? expand : undefined}>
			<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<path d="M12 2L2 7l10 5 10-5-10-5z"/>
				<path d="M2 17l10 5 10-5"/>
				<path d="M2 12l10 5 10-5"/>
			</svg>
		</div>
		{#if !collapsed}
			<span class="logo-text">EventFlow</span>
		{/if}
		{#if !collapsed}
			<button class="toggle-btn" onclick={toggle} aria-label="Collapse sidebar">
				<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<rect x="3" y="3" width="18" height="18" rx="2"/>
					<line x1="9" y1="3" x2="9" y2="21"/>
				</svg>
			</button>
		{/if}
	</div>

	<nav class="sidebar-nav">
		<a href="/" class="nav-link active">
			<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
				<polyline points="9 22 9 12 15 12 15 22"/>
			</svg>
			{#if !collapsed}<span>Dashboard</span>{/if}
		</a>
		<a href="/" class="nav-link">
			<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4-4v2"/>
				<circle cx="9" cy="7" r="4"/>
				<path d="M23 21v-2a4 4 0 00-3-3.87"/>
				<path d="M16 3.13a4 4 0 010 7.75"/>
			</svg>
			{#if !collapsed}<span>Guests</span>{/if}
		</a>
		<a href="/" class="nav-link">
			<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
				<line x1="16" y1="2" x2="16" y2="6"/>
				<line x1="8" y1="2" x2="8" y2="6"/>
				<line x1="3" y1="10" x2="21" y2="10"/>
			</svg>
			{#if !collapsed}<span>Events</span>{/if}
		</a>
		<a href="/" class="nav-link">
			<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<circle cx="12" cy="12" r="3"/>
				<path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/>
			</svg>
			{#if !collapsed}<span>Settings</span>{/if}
		</a>
	</nav>

	<div class="sidebar-footer">
		<a href="/" class="nav-link">
			<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
				<polyline points="16 17 21 12 16 7"/>
				<line x1="21" y1="12" x2="9" y2="12"/>
			</svg>
			{#if !collapsed}<span>Logout</span>{/if}
		</a>
	</div>
</aside>

<style>
	.sidebar {
		display: none;
		position: fixed;
		left: 0;
		top: 0;
		bottom: 0;
		width: 260px;
		background: #800000;
		flex-direction: column;
		z-index: 100;
		transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
		overflow: hidden;
	}

	.sidebar.collapsed {
		width: 72px;
	}

	@media (min-width: 768px) {
		.sidebar {
			display: flex;
		}
	}

	.sidebar-header {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 20px 16px;
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
		min-height: 64px;
	}

	.collapsed .sidebar-header {
		justify-content: center;
		padding: 20px 0;
	}

	.logo-icon {
		width: 40px;
		height: 40px;
		min-width: 40px;
		background: rgba(255, 255, 255, 0.2);
		border-radius: 10px;
		display: flex;
		align-items: center;
		justify-content: center;
		color: white;
	}

	.collapsed .logo-icon {
		cursor: pointer;
	}

	.logo-text {
		color: white;
		font-size: 18px;
		font-weight: 700;
		white-space: nowrap;
	}

	.toggle-btn {
		margin-left: auto;
		background: none;
		border: none;
		color: rgba(255, 255, 255, 0.6);
		cursor: pointer;
		padding: 6px;
		border-radius: 6px;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: color 0.2s, background 0.2s;
	}

	.toggle-btn:hover {
		color: white;
		background: rgba(255, 255, 255, 0.1);
	}

	.sidebar-nav {
		flex: 1;
		display: flex;
		flex-direction: column;
		padding: 12px 8px;
		gap: 4px;
	}

	.nav-link {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 12px 16px;
		color: rgba(255, 255, 255, 0.7);
		text-decoration: none;
		border-radius: 10px;
		font-size: 14px;
		font-weight: 500;
		transition: background 0.2s, color 0.2s;
		white-space: nowrap;
	}

	.collapsed .nav-link {
		justify-content: center;
		padding: 12px;
	}

	.nav-link:hover {
		background: rgba(255, 255, 255, 0.1);
		color: white;
	}

	.nav-link.active {
		background: rgba(255, 255, 255, 0.15);
		color: white;
	}

	.sidebar-footer {
		padding: 12px 8px;
		border-top: 1px solid rgba(255, 255, 255, 0.1);
	}
</style>

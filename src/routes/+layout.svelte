<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { browser } from '$app/environment';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import { injectSpeedInsights } from '@vercel/speed-insights/sveltekit';

	injectSpeedInsights();

	let { children } = $props();

	let sidebarCollapsed = $state(false);

	if (browser) {
		sidebarCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';
	}

	$effect(() => {
		if (browser) {
			document.body.style.setProperty('--sidebar-width', sidebarCollapsed ? '72px' : '260px');
		}
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

<Sidebar bind:collapsed={sidebarCollapsed} />
{@render children()}

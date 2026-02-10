<script lang="ts">
	import { browser } from '$app/environment';
	import Navbar from '$lib/components/Navbar.svelte';
	import GuestList from '$lib/components/GuestList.svelte';
	import BottomDock from '$lib/components/BottomDock.svelte';
	import ScannerModal from '$lib/components/ScannerModal.svelte';

	let scannerOpen = $state(false);
	let scanCount = $state(0);
	let guestListRef: GuestList | undefined = $state();

	if (browser) {
		scanCount = parseInt(localStorage.getItem('scanCount') || '0');
	}

	function openScanner() {
		scannerOpen = true;
	}

	function onScanSuccess() {
		if (browser) {
			scanCount = parseInt(localStorage.getItem('scanCount') || '0');
		}
		guestListRef?.loadGuests();
	}

	function onScanClose() {
		scannerOpen = false;
	}
</script>

<svelte:head>
	<title>Event Entry Scanner</title>
</svelte:head>

<Navbar {scanCount} onScanClick={openScanner} />

<main class="content">
	<GuestList bind:this={guestListRef} />
</main>

<BottomDock onScanClick={openScanner} />
<ScannerModal bind:open={scannerOpen} onSuccess={onScanSuccess} onClose={onScanClose} />

<style>
	.content {
		flex: 1;
		overflow-y: auto;
		overflow-x: hidden;
	}
</style>

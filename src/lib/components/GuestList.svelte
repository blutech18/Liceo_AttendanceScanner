<script lang="ts">
	import { browser } from '$app/environment';
	import { onMount, onDestroy } from 'svelte';

	interface Guest {
		name: string;
		email: string;
		type: string;
		scanTime: string | null;
		attended: boolean;
	}

	let guests = $state<Guest[]>([]);
	let loading = $state(true);
	let refreshing = $state(false);
	let filter = $state('all');
	let typeFilter = $state('all');
	let sort = $state('default');
	let pageSize = $state(25);
	let search = $state('');
	let intervalId: ReturnType<typeof setInterval> | null = null;

	let attendedCount = $derived(guests.filter((g) => g.attended).length);
	let totalCount = $derived(guests.length);

	// Derive unique participant types from data (only show type filter when >1 type exists)
	let participantTypes = $derived.by(() => {
		const types = new Set(guests.map((g) => g.type).filter(Boolean));
		return Array.from(types).sort();
	});
	let hasMultipleTypes = $derived(participantTypes.length > 1);

	// Pagination
	let currentPage = $state(1);

	let filteredGuests = $derived.by(() => {
		let list = [...guests];

		// Type filter
		if (typeFilter !== 'all') {
			list = list.filter((g) => g.type === typeFilter);
		}

		// Attendance filter
		if (filter === 'attended') {
			list = list.filter((g) => g.attended);
		} else if (filter === 'notyet') {
			list = list.filter((g) => !g.attended);
		}

		// Search filter
		const q = search.trim().toLowerCase();
		if (q) {
			list = list.filter(
				(g) => g.name.toLowerCase().includes(q) || g.email.toLowerCase().includes(q)
			);
		}

		// Sort
		if (sort === 'newest') {
			list.sort((a, b) => {
				if (!a.scanTime && !b.scanTime) return 0;
				if (!a.scanTime) return 1;
				if (!b.scanTime) return -1;
				return new Date(b.scanTime).getTime() - new Date(a.scanTime).getTime();
			});
		} else if (sort === 'oldest') {
			list.sort((a, b) => {
				if (!a.scanTime && !b.scanTime) return 0;
				if (!a.scanTime) return 1;
				if (!b.scanTime) return -1;
				return new Date(a.scanTime).getTime() - new Date(b.scanTime).getTime();
			});
		} else {
			// Default: attended first (newest scan on top), then unattended
			list.sort((a, b) => {
				if (a.attended && !b.attended) return -1;
				if (!a.attended && b.attended) return 1;
				if (a.attended && b.attended) {
					if (!a.scanTime) return 1;
					if (!b.scanTime) return -1;
					return new Date(b.scanTime).getTime() - new Date(a.scanTime).getTime();
				}
				return 0;
			});
		}

		return list;
	});

	let totalPages = $derived(Math.max(1, Math.ceil(filteredGuests.length / pageSize)));
	let pagedGuests = $derived(
		filteredGuests.slice((currentPage - 1) * pageSize, currentPage * pageSize)
	);

	// Reset to page 1 when any filter/sort/pageSize/search changes
	$effect(() => {
		filter;
		typeFilter;
		sort;
		pageSize;
		search;
		currentPage = 1;
	});

	function goToPage(page: number) {
		currentPage = Math.max(1, Math.min(page, totalPages));
	}

	export async function loadGuests() {
		if (!loading) refreshing = true;
		try {
			const response = await fetch('/api/attendees');
			const data = await response.json();

			if (data.success) {
				const attendedMap = new Map<string, any>();
				if (data.attendees) {
					for (const a of data.attendees) {
						const key = (a.email || a.name || '').toLowerCase();
						attendedMap.set(key, a);
					}
				}

				if (data.registered && data.registered.length > 0) {
					guests = data.registered.map((r: any) => {
						const key = (r.email || r.name || '').toLowerCase();
						const match = attendedMap.get(key);
						return {
							name: r.name || '',
							email: r.email || '',
							type: (r.type || r.participantType || r.category || '').trim(),
							scanTime: match ? match.scanTime || null : null,
							attended: !!match
						};
					});
				} else if (data.attendees) {
					guests = data.attendees.map((a: any) => ({
						name: a.name || '',
						email: a.email || '',
						type: (a.type || a.participantType || a.category || '').trim(),
						scanTime: a.scanTime || null,
						attended: true
					}));
				}
			}
		} catch (err) {
			console.error('Failed to load guests:', err);
		} finally {
			loading = false;
			refreshing = false;
		}
	}

	function formatTimeMobile(time: string | null): string {
		if (!time) return '—';
		try {
			const d = new Date(time);
			if (isNaN(d.getTime())) return time;
			return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
		} catch {
			return time;
		}
	}

	function formatTimeDesktop(time: string | null): string {
		if (!time) return '—';
		try {
			const d = new Date(time);
			if (isNaN(d.getTime())) return time;
			return d.toLocaleString();
		} catch {
			return time;
		}
	}

	onMount(() => {
		loadGuests();
		intervalId = setInterval(loadGuests, 30000);
	});

	onDestroy(() => {
		if (intervalId) clearInterval(intervalId);
	});
</script>

<div class="page-layout">
	<div class="main-section">
		<div class="attendee-panel">
			<div class="panel-header">
				<div class="header-left">
					<h2 class="panel-title">Guest List</h2>
					<span class="count-badge">{attendedCount}/{totalCount}</span>
				</div>
				<div class="header-right">
					<select class="filter-select" bind:value={filter}>
						<option value="all">All</option>
						<option value="attended">Attended</option>
						<option value="notyet">Not Yet</option>
					</select>
					<select class="filter-select" bind:value={sort}>
						<option value="default">Default</option>
						<option value="newest">Newest</option>
						<option value="oldest">Oldest</option>
					</select>
					<button
						class="refresh-btn"
						class:spinning={refreshing}
						onclick={() => loadGuests()}
						aria-label="Refresh"
					>
						<svg width="14" height="14" viewBox="0 0 24 24" fill="#800000">
							<path
								d="M17.65 6.35A7.958 7.958 0 0012 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0112 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"
							/>
						</svg>
					</button>
				</div>
			</div>

			<div class="search-bar">
				<div class="search-field">
					<svg
						class="search-icon"
						width="15"
						height="15"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2.5"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<circle cx="11" cy="11" r="8" />
						<line x1="21" y1="21" x2="16.65" y2="16.65" />
					</svg>
					<input
						class="search-input"
						type="search"
						placeholder="Search name or email…"
						bind:value={search}
					/>
					{#if search}
						<button class="search-clear" onclick={() => (search = '')} aria-label="Clear search">
							<svg
								width="13"
								height="13"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2.5"
								stroke-linecap="round"
							>
								<line x1="18" y1="6" x2="6" y2="18" />
								<line x1="6" y1="6" x2="18" y2="18" />
							</svg>
						</button>
					{/if}
				</div>
			</div>

			{#if hasMultipleTypes}
				<div class="type-filter-bar">
					<button
						class="type-pill"
						class:active={typeFilter === 'all'}
						onclick={() => (typeFilter = 'all')}>All</button
					>
					{#each participantTypes as ptype}
						<button
							class="type-pill"
							class:active={typeFilter === ptype}
							onclick={() => (typeFilter = ptype)}>{ptype}</button
						>
					{/each}
				</div>
			{/if}

			<div class="panel-body">
				{#if loading}
					<div class="loading-state">
						<div class="spinner"></div>
						<p>Loading attendees...</p>
					</div>
				{:else if filteredGuests.length === 0}
					<div class="empty-state">
						<svg
							width="40"
							height="40"
							viewBox="0 0 24 24"
							fill="none"
							stroke="rgba(128,0,0,0.3)"
							stroke-width="1.5"
							stroke-linecap="round"
							stroke-linejoin="round"
						>
							<path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4-4v2" />
							<circle cx="9" cy="7" r="4" />
							<path d="M23 21v-2a4 4 0 00-3-3.87" />
							<path d="M16 3.13a4 4 0 010 7.75" />
						</svg>
						<p>No guests found</p>
					</div>
				{:else}
					<div class="table-scroll">
						<table class="guest-table">
							<thead>
								<tr>
									<th class="col-num">#</th>
									<th class="col-name">Name</th>
									<th class="col-time">Time</th>
									<th class="col-status">Status</th>
								</tr>
							</thead>
							<tbody>
								{#each pagedGuests as guest, i}
									<tr>
										<td class="col-num">{(currentPage - 1) * pageSize + i + 1}</td>
										<td class="col-name">
											<div class="guest-name">{guest.name}</div>
											{#if guest.email}
												<div class="guest-email">{guest.email}</div>
											{/if}
										</td>
										<td class="col-time">
											<span class="time-mobile">{formatTimeMobile(guest.scanTime)}</span>
											<span class="time-desktop">{formatTimeDesktop(guest.scanTime)}</span>
										</td>
										<td class="col-status">
											{#if guest.attended}
												<span class="status-badge attended">Attended</span>
											{:else}
												<span class="status-badge not-attended">Not Yet</span>
											{/if}
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{/if}
			</div>

			{#if !loading && filteredGuests.length > 0}
				<div class="pagination">
					<div class="pagination-left">
						<span class="rows-label">Rows</span>
						<select class="rows-select" bind:value={pageSize}>
							<option value={25}>25</option>
							<option value={50}>50</option>
							<option value={100}>100</option>
						</select>
					</div>
					<div class="pagination-center">
						{#if currentPage > 1}
							<button class="page-btn" onclick={() => goToPage(1)} aria-label="First page">«</button
							>
							<button
								class="page-btn"
								onclick={() => goToPage(currentPage - 1)}
								aria-label="Previous page">‹</button
							>
						{/if}
						<span class="page-info">{currentPage} / {totalPages}</span>
						{#if currentPage < totalPages}
							<button
								class="page-btn"
								onclick={() => goToPage(currentPage + 1)}
								aria-label="Next page">›</button
							>
							<button class="page-btn" onclick={() => goToPage(totalPages)} aria-label="Last page"
								>»</button
							>
						{/if}
					</div>
					<div class="pagination-right">
						<span class="rows-label">{filteredGuests.length} total</span>
					</div>
				</div>
			{/if}
		</div>
	</div>
</div>

<style>
	.page-layout {
		display: flex;
		flex-direction: column;
		max-width: 1100px;
		margin: 0 auto;
		padding: 10px 10px 0;
		animation: fadeInUp 0.4s ease-out;
		/* Fill height: viewport minus navbar (~56px) minus dock area (~80px) minus top padding (10px) */
		height: calc(100dvh - 56px - 80px - 10px);
	}

	.main-section {
		flex: 1;
		display: flex;
		flex-direction: column;
		min-height: 0;
	}

	.attendee-panel {
		flex: 1;
		display: flex;
		flex-direction: column;
		min-height: 0;
		background: #ffffff;
		border: 1.5px solid #800000;
		border-radius: 16px 16px 12px 12px;
		box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
		overflow: hidden;
	}

	.panel-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 10px 14px;
		gap: 10px;
		flex-wrap: wrap;
		flex-shrink: 0;
	}

	.header-left {
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.panel-title {
		color: #800000;
		font-size: 14px;
		font-weight: 700;
		margin: 0;
	}

	.count-badge {
		background: #800000;
		color: white;
		padding: 3px 10px;
		border-radius: 20px;
		font-size: 12px;
		font-weight: 700;
	}

	.header-right {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.filter-select {
		color: #800000;
		background: rgba(128, 0, 0, 0.05);
		border: 1px solid rgba(128, 0, 0, 0.2);
		border-radius: 8px;
		padding: 6px 24px 6px 8px;
		font-family: 'Inter', sans-serif;
		font-size: 11px;
		font-weight: 500;
		cursor: pointer;
		appearance: none;
		-webkit-appearance: none;
		background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='%23800000'%3E%3Cpath d='M7 10l5 5 5-5z'/%3E%3C/svg%3E");
		background-repeat: no-repeat;
		background-position: right 6px center;
	}

	.filter-select:focus {
		outline: 2px solid rgba(128, 0, 0, 0.3);
		outline-offset: 1px;
	}

	.refresh-btn {
		width: 30px;
		height: 30px;
		border: 1px solid rgba(128, 0, 0, 0.2);
		background: rgba(128, 0, 0, 0.05);
		border-radius: 8px;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		transition: background 0.2s;
	}

	.refresh-btn:hover {
		background: rgba(128, 0, 0, 0.1);
	}

	.refresh-btn.spinning svg {
		animation: spin 1s linear infinite;
	}

	.search-bar {
		padding: 10px 14px;
		border-bottom: 1.5px solid #800000;
		background: #fff;
		flex-shrink: 0;
	}

	.search-field {
		display: flex;
		align-items: center;
		gap: 8px;
		background: rgba(128, 0, 0, 0.04);
		border: 1.5px solid rgba(128, 0, 0, 0.15);
		border-radius: 10px;
		padding: 8px 12px;
		color: rgba(128, 0, 0, 0.4);
		transition:
			border-color 0.2s,
			background 0.2s,
			box-shadow 0.2s;
	}

	.search-field:focus-within {
		border-color: #800000;
		background: #fff;
		box-shadow: 0 0 0 3px rgba(128, 0, 0, 0.08);
		color: #800000;
	}

	.search-icon {
		flex-shrink: 0;
	}

	.search-input {
		flex: 1;
		border: none;
		outline: none;
		background: transparent;
		font-family: 'Inter', sans-serif;
		font-size: 13px;
		color: #3a1010;
		min-width: 0;
		line-height: 1.2;
	}

	.search-input::placeholder {
		color: rgba(128, 0, 0, 0.35);
	}

	/* hide the native clear button on search inputs */
	.search-input::-webkit-search-cancel-button {
		display: none;
	}

	.search-clear {
		background: rgba(128, 0, 0, 0.08);
		border: none;
		width: 20px;
		height: 20px;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		border-radius: 50%;
		color: rgba(128, 0, 0, 0.6);
		transition: background 0.15s;
	}

	.search-clear:hover {
		background: rgba(128, 0, 0, 0.18);
		color: #800000;
	}

	.panel-body {
		flex: 1;
		overflow-y: auto;
		overflow-x: auto;
		min-height: 0;
		-webkit-overflow-scrolling: touch;
	}

	.type-filter-bar {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 8px 14px;
		border-bottom: 1px solid rgba(128, 0, 0, 0.15);
		background: rgba(128, 0, 0, 0.02);
		overflow-x: auto;
		flex-shrink: 0;
		scrollbar-width: none;
	}

	.type-filter-bar::-webkit-scrollbar {
		display: none;
	}

	.type-pill {
		white-space: nowrap;
		padding: 5px 14px;
		border-radius: 20px;
		border: 1.5px solid rgba(128, 0, 0, 0.25);
		background: transparent;
		color: rgba(128, 0, 0, 0.6);
		font-family: 'Inter', sans-serif;
		font-size: 11px;
		font-weight: 600;
		cursor: pointer;
		transition:
			background 0.15s,
			color 0.15s,
			border-color 0.15s;
	}

	.type-pill:hover {
		background: rgba(128, 0, 0, 0.07);
		border-color: rgba(128, 0, 0, 0.4);
		color: #800000;
	}

	.type-pill.active {
		background: #800000;
		border-color: #800000;
		color: #fff;
	}

	.pagination {
		display: grid;
		grid-template-columns: 1fr auto 1fr;
		align-items: center;
		gap: 6px;
		padding: 8px 14px;
		border-top: 1.5px solid #800000;
		background: #fff;
		flex-shrink: 0;
	}

	.pagination-left {
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.pagination-center {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
	}

	.pagination-right {
		display: flex;
		align-items: center;
		justify-content: flex-end;
	}

	.rows-label {
		font-size: 11px;
		font-weight: 500;
		color: rgba(128, 0, 0, 0.5);
		white-space: nowrap;
	}

	.rows-select {
		color: #800000;
		background: rgba(128, 0, 0, 0.05);
		border: 1px solid rgba(128, 0, 0, 0.2);
		border-radius: 6px;
		padding: 4px 20px 4px 6px;
		font-family: 'Inter', sans-serif;
		font-size: 11px;
		font-weight: 600;
		cursor: pointer;
		appearance: none;
		-webkit-appearance: none;
		background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='%23800000'%3E%3Cpath d='M7 10l5 5 5-5z'/%3E%3C/svg%3E");
		background-repeat: no-repeat;
		background-position: right 4px center;
	}

	.rows-select:focus {
		outline: 2px solid rgba(128, 0, 0, 0.3);
		outline-offset: 1px;
	}

	.page-btn {
		width: 32px;
		height: 32px;
		border-radius: 8px;
		border: none;
		background: #800000;
		color: #ffffff;
		font-size: 15px;
		font-weight: 700;
		font-family: 'Inter', sans-serif;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		line-height: 1;
		box-shadow: 0 2px 6px rgba(128, 0, 0, 0.3);
		transition:
			background 0.15s,
			transform 0.1s,
			box-shadow 0.15s;
	}

	.page-btn:hover {
		background: #9a0000;
		box-shadow: 0 4px 10px rgba(128, 0, 0, 0.4);
		transform: translateY(-1px);
	}

	.page-btn:active {
		background: #5c0000;
		box-shadow: 0 1px 3px rgba(128, 0, 0, 0.25);
		transform: translateY(0);
	}

	.page-info {
		font-size: 12px;
		font-weight: 600;
		color: #800000;
		min-width: 52px;
		text-align: center;
	}

	.table-scroll {
		min-width: 100%;
	}

	.guest-table {
		width: 100%;
		border-collapse: collapse;
	}

	.guest-table th {
		position: sticky;
		top: 0;
		background: white;
		color: rgba(128, 0, 0, 0.5);
		font-size: 10px;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.5px;
		padding: 10px 12px;
		text-align: left;
		border-bottom: 1.5px solid #800000;
		border-right: 1px solid #800000;
		z-index: 1;
	}

	.guest-table th:last-child {
		border-right: none;
	}

	.guest-table td {
		padding: 10px;
		color: #3a1010;
		font-size: 12px;
		border-bottom: 1px solid #800000;
		border-right: 1px solid #800000;
	}

	.guest-table td:last-child {
		border-right: none;
	}

	.guest-table tbody tr:last-child td {
		border-bottom: none;
	}

	.col-num {
		width: 40px;
		text-align: center;
		color: rgba(128, 0, 0, 0.4);
		font-weight: 600;
	}

	.guest-name {
		color: #800000;
		font-weight: 700;
		font-size: 13px;
	}

	.guest-email {
		color: rgba(60, 16, 16, 0.5);
		font-size: 11px;
		margin-top: 2px;
	}

	.col-time {
		white-space: nowrap;
	}

	.time-mobile {
		display: inline;
		color: rgba(60, 16, 16, 0.45);
		font-size: 11px;
	}

	.time-desktop {
		display: none;
		color: rgba(60, 16, 16, 0.45);
		font-size: 11px;
	}

	.status-badge {
		display: inline-block;
		padding: 4px 10px;
		border-radius: 6px;
		font-size: 11px;
		font-weight: 600;
	}

	.status-badge.attended {
		background: rgba(34, 197, 94, 0.1);
		color: #16a34a;
	}

	.status-badge.not-attended {
		background: rgba(128, 0, 0, 0.08);
		color: rgba(128, 0, 0, 0.5);
	}

	.loading-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 50px 20px;
		color: rgba(128, 0, 0, 0.45);
		font-size: 13px;
	}

	.spinner {
		width: 32px;
		height: 32px;
		border: 3px solid rgba(128, 0, 0, 0.15);
		border-top-color: #800000;
		border-radius: 50%;
		animation: spin 1s linear infinite;
		margin-bottom: 12px;
	}

	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 50px 20px;
		color: rgba(128, 0, 0, 0.45);
		font-size: 13px;
		gap: 12px;
	}

	@keyframes spin {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}

	@keyframes fadeInUp {
		from {
			opacity: 0;
			transform: translateY(20px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	/* >=480px */
	@media (min-width: 480px) {
		.guest-table td {
			padding: 12px;
			font-size: 13px;
		}
		.panel-title {
			font-size: 16px;
		}
	}

	/* >=768px */
	@media (min-width: 768px) {
		.page-layout {
			padding: 16px 16px 0;
			max-width: 1400px;
			/* On desktop the dock is hidden; navbar is taller (~64px) */
			height: calc(100dvh - 64px - 20px);
		}

		.main-section {
			padding-bottom: 0;
		}

		.attendee-panel {
			border-radius: 20px;
		}

		.panel-header {
			padding: 16px 20px;
		}

		.panel-title {
			font-size: 18px;
		}

		.guest-table th {
			padding: 10px 16px;
			font-size: 11px;
		}

		.guest-table td {
			padding: 14px 16px;
			font-size: 14px;
		}

		.guest-name {
			font-size: 14px;
		}

		.guest-email {
			font-size: 12px;
		}

		.guest-table tbody tr:hover td {
			background: rgba(128, 0, 0, 0.03);
		}

		.time-mobile {
			display: none;
		}

		.time-desktop {
			display: inline;
		}
	}

	/* sidebar-collapsed wider layout */
	:global(.sidebar-collapsed-layout) .page-layout {
		max-width: 1600px;
	}

	/* >=1024px */
	@media (min-width: 1024px) {
		.page-layout {
			padding: 20px 24px 0;
		}
	}
</style>

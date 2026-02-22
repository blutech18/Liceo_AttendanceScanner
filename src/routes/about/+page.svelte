<script lang="ts">
	import Navbar from '$lib/components/Navbar.svelte';
	import Footer from '$lib/components/Footer.svelte';

	const developers = [
		{ name: 'Mark Elvin Daguplo', role: 'Developer', initials: 'MD' },
		{ name: 'Developer 2', role: 'Developer', initials: 'D2' },
		{ name: 'Developer 3', role: 'Developer', initials: 'D3' },
		{ name: 'Developer 4', role: 'Developer', initials: 'D4' }
	];
</script>

<svelte:head>
	<title>About | Liceo EdTech</title>
</svelte:head>

<Navbar title="About" />

<main class="content">
	<div class="page-wrapper">
		<div class="two-col">
			<!-- ── LEFT: Logo + Description ── -->
			<div class="col-left">
				<div class="logo-wrap">
					<img src="/edtech_logo.png" alt="Liceo EdTech Logo" class="logo-img" />
				</div>

				<h1 class="sys-name">Liceo EdTech QR Attendance Checker</h1>

				<p class="description">
					Created by the EdTech Team for the <strong
						>18th Rodelsa International Lecture Series</strong
					> at Liceo de Cagayan University. It allows event organizers to quickly check in pre-registered
					guests using seamless QR code scanning.
				</p>
			</div>

			<!-- ── DIVIDER ── -->
			<div class="col-divider"></div>

			<!-- ── RIGHT: Dev Team ── -->
			<div class="col-right">
				<div class="team-header">
					<h2 class="team-title">Meet the Developers</h2>
				</div>

				<div class="dev-grid">
					{#each developers as dev, i}
						<div class="dev-card" style="animation-delay: {i * 70}ms">
							<div class="dev-initials">{dev.initials}</div>
							<div class="dev-info-overlay">
								<div class="dev-name">{dev.name}</div>
							</div>
						</div>
					{/each}
				</div>
			</div>
		</div>
	</div>
	<Footer />
</main>

<style>
	.content {
		flex: 1;
		overflow-y: auto;
		overflow-x: hidden;
		display: flex;
		flex-direction: column;
		background: var(--bg-primary);
	}

	.page-wrapper {
		flex: 1;
		display: flex;
		align-items: center;
		padding: 40px 32px;
		max-width: 1200px;
		width: 100%;
		margin: 0 auto;
	}

	/* ── Two-column grid ── */
	.two-col {
		display: grid;
		grid-template-columns: 1fr auto 1fr;
		gap: 0;
		width: 100%;
		align-items: center;
	}

	/* ── Left column ── */
	.col-left {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		gap: 20px;
		padding-right: 48px;
	}

	.logo-wrap {
		width: 120px;
		height: 120px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.logo-img {
		width: 100%;
		height: 100%;
		object-fit: contain;
	}

	.sys-name {
		font-size: clamp(20px, 2.5vw, 28px);
		font-weight: 800;
		color: var(--text-primary, #111827);
		margin: 0;
		line-height: 1.2;
		letter-spacing: -0.02em;
		white-space: nowrap;
	}

	.description {
		font-size: 15px;
		line-height: 1.75;
		color: var(--text-secondary, #4b5563);
		margin: 0;
		max-width: 420px;
	}

	/* ── Divider ── */
	.col-divider {
		width: 1px;
		align-self: stretch;
		background: linear-gradient(
			to bottom,
			transparent,
			rgba(128, 0, 0, 0.2) 20%,
			rgba(128, 0, 0, 0.2) 80%,
			transparent
		);
		margin: 0 16px;
	}

	/* ── Right column ── */
	.col-right {
		display: flex;
		flex-direction: column;
		gap: 24px;
		padding-left: 48px;
	}

	.team-header {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		gap: 6px;
	}

	.team-title {
		font-size: 26px;
		font-weight: 800;
		color: var(--text-primary, #111827);
		margin: 0;
		letter-spacing: -0.02em;
	}

	.dev-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 16px;
	}

	/* ── Dev Cards (Simple Profiles) ── */
	.dev-card {
		display: flex;
		flex-direction: column;
		aspect-ratio: 1 / 1;
		background: linear-gradient(135deg, #800000 0%, #a41010 100%);
		border-radius: 20px;
		color: white;
		box-shadow: 0 6px 16px rgba(128, 0, 0, 0.15);
		transition:
			transform 0.2s ease,
			box-shadow 0.2s ease;
		animation: fadeUp 0.4s ease both;
		overflow: hidden;
		position: relative;
	}

	.dev-card:hover {
		transform: translateY(-4px);
		box-shadow: 0 12px 28px rgba(128, 0, 0, 0.25);
	}

	@keyframes fadeUp {
		from {
			opacity: 0;
			transform: translateY(16px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.dev-initials {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 42px;
		font-weight: 800;
		letter-spacing: -0.02em;
		text-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
	}

	.dev-info-overlay {
		width: 100%;
		padding: 14px 12px;
		background: rgba(0, 0, 0, 0.25);
		backdrop-filter: blur(8px);
		-webkit-backdrop-filter: blur(8px);
		text-align: center;
	}

	.dev-name {
		font-size: 14px;
		font-weight: 700;
		color: white;
		margin-bottom: 2px;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	/* ── Responsive ── */
	@media (max-width: 1024px) {
		.two-col {
			grid-template-columns: 1fr;
			gap: 40px;
		}

		.col-divider {
			width: 100%;
			height: 1px;
			align-self: auto;
			background: linear-gradient(
				to right,
				transparent,
				rgba(128, 0, 0, 0.2) 20%,
				rgba(128, 0, 0, 0.2) 80%,
				transparent
			);
			margin: 0;
		}

		.col-left,
		.col-right {
			padding: 0;
		}

		.sys-name {
			white-space: normal;
			font-size: clamp(22px, 5vw, 28px);
		}
	}

	@media (max-width: 640px) {
		.page-wrapper {
			padding: 24px 16px 40px;
		}

		.dev-grid {
			grid-template-columns: repeat(2, 1fr);
			gap: 12px;
		}

		.sys-name {
			font-size: 24px;
			line-height: 1.3;
		}

		.dev-initials {
			font-size: 32px;
		}

		.dev-name {
			font-size: 13px;
		}
	}

	@media (max-width: 480px) {
		.dev-grid {
			grid-template-columns: 1fr;
			max-width: 280px;
			margin: 0 auto;
			width: 100%;
		}
		.dev-card {
			aspect-ratio: auto;
			height: 200px;
		}
	}
</style>

<script lang="ts">
	import { onMount } from 'svelte';

	let playerPageUrl = '';
	let qrCodeUrl = '';

	// When the component loads in the browser, we can safely access window.location
	onMount(() => {
		// Construct the full URL to the player page (e.g., https://yoursite.com/player)
		playerPageUrl = `${window.location.origin}/player`;

		// Use a free API to generate a QR code image from that URL
		qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=256x256&data=${encodeURIComponent(
			playerPageUrl
		)}`;
	});
</script>

<div class="bg-neutral-900 text-white min-h-screen flex flex-col items-center justify-center p-4">
	<div class="text-center">
		<h1 class="text-4xl md:text-5xl font-bold text-green-500 mb-4">Join the Game</h1>
		<p class="text-neutral-400 mb-8">Scan the QR code with your phone to join as a player.</p>

		<div
			class="bg-white p-4 rounded-lg shadow-2xl inline-block transition-opacity duration-500"
			class:opacity-0={!qrCodeUrl}
		>
			{#if qrCodeUrl}
				<img src={qrCodeUrl} alt="QR Code to join the game" width="256" height="256" />
			{:else}
				<!-- CORRECTED: Changed self-closing div to have a full closing tag -->
				<div class="w-64 h-64 bg-neutral-200 animate-pulse rounded-md"></div>
			{/if}
		</div>

		{#if playerPageUrl}
			<p class="mt-8 text-neutral-500 text-sm">
				Or go to: <a href={playerPageUrl} class="underline hover:text-green-400">{playerPageUrl}</a>
			</p>
		{/if}
	</div>
</div>


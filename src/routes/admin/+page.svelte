<script lang="ts">
	import { supabase } from '$lib/supabaseClient';
	import { userSession } from '$lib/store';
	import type { CurrentlyPlaying } from '../../types';
	import { slide } from 'svelte/transition';

	let currentlyPlaying: CurrentlyPlaying | null = null;
	let isLoading = true;
	let isRefreshing = false;
	let showAlbumArt = true;
	let isUiControlsExpanded = false;
	let isVolumeControlsExpanded = false;
	let volume = 100;

	// --- Refresh function ---
	function handleRefresh() {
		if ($userSession?.provider_token) {
			getCurrentlyPlaying($userSession.provider_token, true);
		}
	}

	// --- Volume Controls ---
	let fadeInterval: ReturnType<typeof setInterval>;

	// Core function that just sends the API request
	async function _setSpotifyVolume() {
		if (!$userSession?.provider_token) return;
		const endpoint = `https://api.spotify.com/v1/me/player/volume?volume_percent=${volume}`;
		await fetch(endpoint, {
			method: 'PUT',
			headers: { Authorization: `Bearer ${$userSession.provider_token}` }
		});
	}

	// Function for manual adjustments (slider, presets, inc/dec)
	function setVolume() {
		// Stop any fade if the user manually intervenes
		clearInterval(fadeInterval);
		// Snap the value to the nearest 5 for slider control
		volume = Math.round(volume / 5) * 5;
		// Send the API request
		_setSpotifyVolume();
	}

	function incrementVolume() {
		clearInterval(fadeInterval);
		volume = Math.min(100, volume + 5); // Changed back to 5
		setVolume();
	}
	function decrementVolume() {
		clearInterval(fadeInterval);
		volume = Math.max(0, volume - 5); // Changed back to 5
		setVolume();
	}

	function setVolumePreset(newVolume: number) {
		clearInterval(fadeInterval);
		volume = newVolume;
		setVolume();
	}

	function fadeVolume(fadeIn: boolean) {
		clearInterval(fadeInterval); // Start a new fade from scratch

		const targetVolume = fadeIn ? 100 : 0;
		if (volume === targetVolume) return;

		const totalDuration = 3000; // Changed to 3 seconds
		const steps = Math.abs(targetVolume - volume) / 10; // Fades still use 10 for fewer API calls
		if (steps === 0) return;
		const stepInterval = totalDuration / steps;

		fadeInterval = setInterval(() => {
			volume = fadeIn ? Math.min(100, volume + 10) : Math.max(0, volume - 10);

			_setSpotifyVolume();

			if (volume === targetVolume) {
				clearInterval(fadeInterval);
			}
		}, stepInterval);
	}

	// --- UI Toggles ---
	function toggleAlbumArt() {
		showAlbumArt = !showAlbumArt;
	}
	function toggleUiControls() {
		isUiControlsExpanded = !isUiControlsExpanded;
	}
	function toggleVolumeControls() {
		isVolumeControlsExpanded = !isVolumeControlsExpanded;
	}

	// --- Auth & API Functions ---
	async function loginWithSpotify() {
		await supabase.auth.signInWithOAuth({
			provider: 'spotify',
			options: {
				scopes:
					'user-read-email playlist-read-private user-read-playback-state user-modify-playback-state',
				redirectTo: window.location.href
			}
		});
	}
	async function logout() {
		await supabase.auth.signOut();
		currentlyPlaying = null;
	}
	async function getCurrentlyPlaying(token: string, isRefresh = false) {
		if (!isRefresh) isLoading = true;
		isRefreshing = true;
		const endpoint = 'https://api.spotify.com/v1/me/player';
		const response = await fetch(endpoint, {
			headers: { Authorization: `Bearer ${token}` }
		});
		if (response.status === 204 || response.status > 400) {
			currentlyPlaying = null;
		} else if (response.ok) {
			const data = await response.json();
			currentlyPlaying = data;
			if (data && data.device) {
				volume = data.device.volume_percent;
			}
		}
		isLoading = false;
		setTimeout(() => (isRefreshing = false), 500);
	}

	async function playerAction(endpoint: string, method: 'PUT' | 'POST') {
		if (!$userSession?.provider_token) return;
		isRefreshing = true;
		try {
			await fetch(endpoint, {
				method,
				headers: { Authorization: `Bearer ${$userSession.provider_token}` }
			});
			setTimeout(() => {
				if ($userSession?.provider_token) getCurrentlyPlaying($userSession.provider_token, true);
			}, 500);
		} finally {
			setTimeout(() => (isRefreshing = false), 700);
		}
	}
	function play() {
		playerAction('https://api.spotify.com/v1/me/player/play', 'PUT');
	}
	function pause() {
		playerAction('https://api.spotify.com/v1/me/player/pause', 'PUT');
	}
	function nextTrack() {
		playerAction('https://api.spotify.com/v1/me/player/next', 'POST');
	}
	function prevTrack() {
		playerAction('https://api.spotify.com/v1/me/player/previous', 'POST');
	}
	$: if ($userSession?.provider_token) {
		getCurrentlyPlaying($userSession.provider_token);
	}
</script>

<div class="bg-neutral-900 text-white min-h-screen flex items-center justify-center p-4">
	<div class="w-full max-w-sm rounded-2xl bg-gradient-to-br from-green-500 to-green-700 p-1">
		<main
			class="bg-neutral-900 rounded-xl w-full min-h-[600px] p-8 flex flex-col items-center"
		>
			{#if $userSession}
				<!-- Player Area -->
				<div
					class="w-full flex-grow flex flex-col items-center justify-center gap-6 transition-opacity"
					class:opacity-50={isRefreshing}
				>
					{#if isLoading}
						<p class="text-neutral-400">Loading...</p>
					{:else if currentlyPlaying?.item}
						{#if showAlbumArt}
							<img
								src={currentlyPlaying.item.album.images[0].url}
								alt={currentlyPlaying.item.album.name}
								class="w-48 h-48 rounded-md shadow-lg"
							/>
						{/if}
						<div class="text-center w-full min-w-0">
							<p class="font-bold text-xl truncate">{currentlyPlaying.item.name}</p>
							<p class="text-neutral-400 text-sm truncate">
								{currentlyPlaying.item.artists.map((a) => a.name).join(', ')}
							</p>
						</div>
						<div class="w-full max-w-xs">
							<input
								type="range"
								min="0"
								max="100"
								step="5"
								bind:value={volume}
								on:change={setVolume}
								disabled={!currentlyPlaying}
								aria-label="Volume"
								class="w-full h-2 rounded-lg appearance-none cursor-pointer accent-green-500 bg-neutral-700 disabled:opacity-50"
							/>
						</div>
						<div class="flex items-center gap-6">
							<button
								on:click={prevTrack}
								class="text-neutral-400 hover:text-white transition-colors"
								aria-label="Previous Track"
							>
								<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24"><path fill="currentColor" d="M6 6h2v12H6zm3.5 6L18 6v12l-8.5-6z" /></svg>
							</button>
							<button
								on:click={currentlyPlaying.is_playing ? pause : play}
								class="bg-white text-black rounded-full p-3 hover:scale-110 transition-transform"
								aria-label={currentlyPlaying.is_playing ? 'Pause' : 'Play'}
							>
								{#if currentlyPlaying.is_playing}
									<svg xmlns="http://www.w3.org/2000/svg" class="w-8 h-8" viewBox="0 0 24 24" fill="currentColor"><path d="M6 5h4v14H6V5zm8 0h4v14h-4V5z"/></svg>
								{:else}
									<svg xmlns="http://www.w3.org/2000/svg" class="w-8 h-8" viewBox="0 0 24 24" fill="currentColor"><path d="M8 6.82v10.36c0 .79.87 1.27 1.54.84l8.14-5.18c.62-.39.62-1.29 0-1.69L9.54 5.98C8.87 5.55 8 6.03 8 6.82z"/></svg>
								{/if}
							</button>
							<button
								on:click={nextTrack}
								class="text-neutral-400 hover:text-white transition-colors"
								aria-label="Next Track"
							>
								<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24"><path fill="currentColor" d="M6 18v-12l8.5 6L6 18zM16 6h2v12h-2z" /></svg>
							</button>
						</div>
					{:else}
						<div class="text-center">
							<p class="font-bold text-xl">Nothing Playing</p>
							<p class="text-neutral-400 mt-1">Open Spotify and play a song.</p>
						</div>
					{/if}
				</div>

				<!-- Collapsible Controls Section -->
				<div class="w-full mt-4 flex flex-col gap-2">
					<!-- Volume Controls Panel -->
					<div class="bg-neutral-800 rounded-lg">
						<button
							on:click={toggleVolumeControls}
							class="w-full flex justify-between items-center p-3 text-sm font-semibold"
							disabled={!currentlyPlaying}
						>
							<span>Volume Controls</span>
							<svg
								class="w-5 h-5 transition-transform"
								class:rotate-180={isVolumeControlsExpanded}
								xmlns="http://www.w3.org/2000/svg"
								viewBox="0 0 20 20"
								fill="currentColor"
							>
								<path
									fill-rule="evenodd"
									d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
									clip-rule="evenodd"
								/>
							</svg>
						</button>
						{#if isVolumeControlsExpanded}
							<div
								transition:slide={{ duration: 300 }}
								class="p-3 border-t border-neutral-700 flex flex-col gap-3"
							>
								<div class="flex justify-center items-center gap-4">
									<button
										on:click={decrementVolume}
										class="p-2 rounded-full hover:bg-neutral-700"
										aria-label="Decrement volume"
									>
										<svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M19 12.998H5v-2h14z"/></svg>
									</button>
									<span class="text-sm font-semibold w-10 text-center">{volume}%</span>
									<button
										on:click={incrementVolume}
										class="p-2 rounded-full hover:bg-neutral-700"
										aria-label="Increment volume"
									>
										<svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M19 12.998h-6v6h-2v-6H5v-2h6v-6h2v6h6z"/></svg>
									</button>
								</div>
								<div class="flex justify-around items-center">
									<button
										on:click={() => setVolumePreset(0)}
										class="text-xs font-semibold px-3 py-1 rounded-full hover:bg-neutral-700"
										>0%</button
									>
									<button
										on:click={() => setVolumePreset(25)}
										class="text-xs font-semibold px-3 py-1 rounded-full hover:bg-neutral-700"
										>25%</button
									>
									<button
										on:click={() => setVolumePreset(50)}
										class="text-xs font-semibold px-3 py-1 rounded-full hover:bg-neutral-700"
										>50%</button
									>
									<button
										on:click={() => setVolumePreset(75)}
										class="text-xs font-semibold px-3 py-1 rounded-full hover:bg-neutral-700"
										>75%</button
									>
									<button
										on:click={() => setVolumePreset(100)}
										class="text-xs font-semibold px-3 py-1 rounded-full hover:bg-neutral-700"
										>100%</button
									>
								</div>
								<div class="flex justify-around items-center pt-2">
									<button
										on:click={() => fadeVolume(false)}
										class="text-xs font-semibold px-3 py-1 rounded-full hover:bg-neutral-700"
										>Fade Out</button
									>
									<button
										on:click={() => fadeVolume(true)}
										class="text-xs font-semibold px-3 py-1 rounded-full hover:bg-neutral-700"
										>Fade In</button
									>
								</div>
							</div>
						{/if}
					</div>

					<!-- UI Controls Panel -->
					<div class="bg-neutral-800 rounded-lg">
						<button
							on:click={toggleUiControls}
							class="w-full flex justify-between items-center p-3 text-sm font-semibold"
						>
							<span>UI Controls</span>
							<svg
								class="w-5 h-5 transition-transform"
								class:rotate-180={isUiControlsExpanded}
								xmlns="http://www.w3.org/2000/svg"
								viewBox="0 0 20 20"
								fill="currentColor"
							>
								<path
									fill-rule="evenodd"
									d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
									clip-rule="evenodd"
								/>
							</svg>
						</button>
						{#if isUiControlsExpanded}
							<div
								transition:slide={{ duration: 300 }}
								class="p-3 border-t border-neutral-700 flex justify-center gap-4"
							>
								<!-- Refresh Button -->
								<button
									on:click={handleRefresh}
									aria-label="Refresh currently playing"
									class="p-2 rounded-full hover:bg-neutral-700"
									disabled={!currentlyPlaying}
								>
									<svg 
										class="w-6 h-6" 
										class:animate-spin={isRefreshing}
										xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
										<path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.3"/>
									</svg>
								</button>

								<!-- Toggle Album Art Button -->
								<button
									on:click={toggleAlbumArt}
									aria-label="Toggle album art"
									class="p-2 rounded-full hover:bg-neutral-700"
								>
									{#if showAlbumArt}
										<svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>
									{:else}
										<svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.44-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 9.88 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"/></svg>
									{/if}
								</button>
							</div>
						{/if}
					</div>
				</div>
				<button on:click={logout} class="absolute top-4 right-4 text-neutral-500 hover:text-white text-xs">
					Logout
				</button>
			{:else}
				<div class="text-center h-full flex flex-col justify-center">
					<h1 class="text-3xl font-bold mb-6">Spotify Controller</h1>
					<button
						on:click={loginWithSpotify}
						class="bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-8 rounded-full transition-transform hover:scale-105"
					>
						Login with Spotify
					</button>
				</div>
			{/if}
		</main>
	</div>
</div>


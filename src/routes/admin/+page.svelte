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

	// --- New functions for Increment/Decrement ---
	function incrementVolume() {
		// Increase volume by 5, but not past 100
		volume = Math.min(100, volume + 5);
		setVolume();
	}
	function decrementVolume() {
		// Decrease volume by 5, but not past 0
		volume = Math.max(0, volume - 5);
		setVolume();
	}

	function setVolumePreset(newVolume: number) {
		volume = newVolume;
		setVolume();
	}

	function toggleAlbumArt() {
		showAlbumArt = !showAlbumArt;
	}
	function toggleUiControls() {
		isUiControlsExpanded = !isUiControlsExpanded;
	}
	function toggleVolumeControls() {
		isVolumeControlsExpanded = !isVolumeControlsExpanded;
	}
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
		const endpoint = 'https://api.spotify.com/v1/me/player/currently-playing';
		const response = await fetch(endpoint, {
			headers: { Authorization: `Bearer ${token}` }
		});
		if (response.status === 204 || response.status > 400) {
			currentlyPlaying = null;
		} else if (response.ok) {
			const data = await response.json();
			currentlyPlaying = data;
			if (data.device) {
				volume = data.device.volume_percent;
			}
		}
		isLoading = false;
	}
	async function setVolume() {
		if (!$userSession?.provider_token) return;
		const endpoint = `https://api.spotify.com/v1/me/player/volume?volume_percent=${volume}`;
		await fetch(endpoint, {
			method: 'PUT',
			headers: { Authorization: `Bearer ${$userSession.provider_token}` }
		});
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
				<div
					class="w-full flex-grow flex flex-col items-center justify-center gap-6 transition-all duration-300"
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
						<div class="text-center">
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
								<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24"
									><path fill="currentColor" d="M6 6h2v12H6zm3.5 6L18 6v12l-8.5-6z" /></svg
								>
							</button>
							<button
								on:click={currentlyPlaying.is_playing ? pause : play}
								class="bg-white text-black rounded-full p-3 hover:scale-110 transition-transform"
								aria-label={currentlyPlaying.is_playing ? 'Pause' : 'Play'}
							>
								{#if currentlyPlaying.is_playing}
									<svg
										xmlns="http://www.w3.org/2000/svg"
										width="32"
										height="32"
										viewBox="0 0 24 24"
										><path fill="currentColor" d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg
									>
								{:else}
									<svg
										xmlns="http://www.w3.org/2000/svg"
										width="32"
										height="32"
										viewBox="0 0 24 24"
										><path fill="currentColor" d="M8 5v14l11-7z" /></svg
									>
								{/if}
							</button>
							<button
								on:click={nextTrack}
								class="text-neutral-400 hover:text-white transition-colors"
								aria-label="Next Track"
							>
								<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24"
									><path fill="currentColor" d="M6 18v-12l8.5 6L6 18zM16 6h2v12h-2z" /></svg
								>
							</button>
						</div>
					{:else}
						<div class="text-center">
							<p class="font-bold text-xl">Nothing Playing</p>
							<p class="text-neutral-400 mt-1">Open Spotify and play a song.</p>
						</div>
					{/if}
				</div>

				<div class="w-full mt-4 flex flex-col gap-2">
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
										<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"
											><path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M20 12H4"
											/></svg
										>
									</button>
									<span class="text-sm font-semibold w-10 text-center">{volume}%</span>
									<button
										on:click={incrementVolume}
										class="p-2 rounded-full hover:bg-neutral-700"
										aria-label="Increment volume"
									>
										<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"
											><path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M12 4v16m8-8H4"
											/></svg
										>
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
							</div>
						{/if}
					</div>

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
								class="p-3 border-t border-neutral-700 flex justify-center"
							>
								<button
									on:click={toggleAlbumArt}
									aria-label="Toggle album art"
									class="p-2 rounded-full hover:bg-neutral-700"
								>
									{#if showAlbumArt}
										<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"
											><path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18"
											/></svg
										>
									{:else}
										<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"
											><path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
											/><path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M2.458 12C3.732 7.943 7.522 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.478 0-8.268-2.943-9.542-7z"
											/></svg
										>
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
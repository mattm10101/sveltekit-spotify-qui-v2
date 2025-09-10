<h1>Welcome to SvelteKit</h1>
<p>Visit <a href="https://svelte.dev/docs/kit">svelte.dev/docs/kit</a> to read the documentation</p>
<script lang="ts">
	import { supabase } from '$lib/supabaseClient';

	let playerName = '';
	let submitted = false;
	let isLoading = false; // Add a loading state for user feedback

	async function joinGame() {
		if (!playerName.trim()) {
			alert('Please enter a name!');
			return;
		}

		isLoading = true;

		// This is the new part: we save the player to Supabase
		const { error } = await supabase.from('players').insert({
			name: playerName.trim(),
			game_id: 'default_game' // We'll use a single game room for now
			// The 'score' column will automatically default to 0
		});

		if (error) {
			console.error('Error joining game:', error);
			alert('Could not join the game. Please try again.');
			isLoading = false;
		} else {
			// Only move to the "submitted" view if the player was saved successfully
			console.log(`Player '${playerName}' joined the game.`);
			submitted = true;
			// No need to set isLoading back to false, as we're changing the view
		}
	}
</script>

<div class="bg-neutral-900 text-white min-h-screen flex flex-col items-center justify-center p-4">
	<div class="w-full max-w-sm text-center">
		{#if submitted}
			<!-- View after the user submits their name -->
			<div class="bg-neutral-800 p-8 rounded-lg shadow-xl">
				<h1 class="text-3xl font-bold text-green-500 mb-4">Welcome, {playerName}!</h1>
				<p class="text-neutral-400">Please wait for the game to begin.</p>
			</div>
		{:else}
			<!-- Initial name entry form -->
			<h1 class="text-3xl font-bold mb-8">Enter Your Name</h1>
			<form on:submit|preventDefault={joinGame} class="flex flex-col gap-4">
				<input
					type="text"
					bind:value={playerName}
					placeholder="Your Name"
					class="bg-neutral-800 border border-neutral-700 text-white text-lg text-center rounded-lg w-full p-4 focus:ring-green-500 focus:border-green-500"
					maxlength="20"
					disabled={isLoading}
				/>
				<button
					type="submit"
					class="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-4 rounded-lg transition-transform hover:scale-105 disabled:opacity-50 disabled:scale-100"
					disabled={isLoading}
				>
					{#if isLoading}
						Joining...
					{:else}
						Join Game
					{/if}
				</button>
			</form>
		{/if}
	</div>
</div>


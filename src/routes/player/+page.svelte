<script lang="ts">
	let playerName = '';
	let submitted = false;

	function joinGame() {
		// Basic validation
		if (!playerName.trim()) {
			alert('Please enter a name!');
			return;
		}

		// Later, this is where we will save the player to our Supabase database.
		console.log(`Player '${playerName}' joined the game.`);
		submitted = true;
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
				/>
				<button
					type="submit"
					class="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-4 rounded-lg transition-transform hover:scale-105"
				>
					Join Game
				</button>
			</form>
		{/if}
	</div>
</div>
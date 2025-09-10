<script lang="ts">
	import { supabase } from '$lib/supabaseClient';
	import { onMount, onDestroy } from 'svelte';
	import type { RealtimeChannel } from '@supabase/supabase-js';

	// Define types for our data
	type Player = { id: number; name: string; score: number };
	type GameState = {
		id: number;
		show_qr: boolean;
		show_leaderboard: boolean;
		show_instructions: boolean;
	};

	// --- Component State ---
	let players: Player[] = [];
	let qrCodeUrl = '';
	let gameState: GameState | null = null;

	let playerChannel: RealtimeChannel;
	let gameStateChannel: RealtimeChannel;

	// --- NEW: Function to update the shared game state ---
	async function updateDashboardView(column: keyof Omit<GameState, 'id'>) {
		if (!gameState) return;

		// Send an update to the database. The realtime listener will handle the UI change.
		await supabase
			.from('game_state')
			.update({ [column]: !gameState[column] })
			.eq('id', 1);
	}

	async function getPlayers() {
		const { data, error } = await supabase.from('players').select('*').order('score', { ascending: false });
		if (error) {
			console.error('Error fetching players:', error);
		} else {
			players = data || [];
		}
	}

	onMount(() => {
		// --- QR Code Generation ---
		const playerPageUrl = `${window.location.origin}/player`;
		qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=256x256&data=${encodeURIComponent(
			playerPageUrl
		)}`;

		// --- Fetch Initial State ---
		getPlayers();
		supabase
			.from('game_state')
			.select('*')
			.eq('id', 1)
			.single()
			.then(({ data }) => {
				gameState = data;
			});

		// --- Realtime Subscriptions ---
		playerChannel = supabase
			.channel('public:players')
			.on('postgres_changes', { event: '*', schema: 'public', table: 'players' }, () => {
				getPlayers();
			})
			.subscribe();

		gameStateChannel = supabase
			.channel('public:game_state')
			.on(
				'postgres_changes',
				{ event: 'UPDATE', schema: 'public', table: 'game_state', filter: 'id=eq.1' },
				(payload) => {
					gameState = payload.new as GameState;
				}
			)
			.subscribe();
	});

	onDestroy(() => {
		if (playerChannel) supabase.removeChannel(playerChannel);
		if (gameStateChannel) supabase.removeChannel(gameStateChannel);
	});
</script>

<div class="bg-neutral-900 text-white min-h-screen flex flex-col p-4 md:p-8">
	<!-- Main Content Area -->
	<div class="flex-grow flex gap-4 md:gap-8 justify-center items-stretch w-full">
		{#if gameState}
			<!-- QR Code Panel -->
			{#if gameState.show_qr}
				<div
					class="flex-1 bg-neutral-800 rounded-lg p-6 flex flex-col items-center justify-center text-center"
				>
					<h2 class="text-3xl font-bold text-green-500 mb-4">Join the Game</h2>
					<p class="text-neutral-400 mb-6">Scan with your phone to join!</p>
					<div class="bg-white p-4 rounded-lg shadow-lg">
						<img src={qrCodeUrl} alt="QR Code to join game" width="256" height="256" />
					</div>
				</div>
			{/if}

			<!-- Leaderboard Panel -->
			{#if gameState.show_leaderboard}
				<div class="flex-1 bg-neutral-800 rounded-lg p-6 flex flex-col">
					<h2 class="text-3xl font-bold text-green-500 mb-6 text-center">Leaderboard</h2>
					<div class="flex-grow overflow-y-auto pr-2">
						<ul class="space-y-3">
							{#each players as player, i}
								<li class="flex items-center bg-neutral-700 p-3 rounded-md">
									<span class="text-lg font-bold text-green-400 w-8">{i + 1}</span>
									<span class="flex-grow font-semibold text-lg">{player.name}</span>
									<span class="font-bold text-lg">{player.score} pts</span>
								</li>
							{:else}
								<li class="text-center text-neutral-500 pt-8">Waiting for players...</li>
							{/each}
						</ul>
					</div>
				</div>
			{/if}

			<!-- Instructions Panel -->
			{#if gameState.show_instructions}
				<div
					class="flex-1 bg-neutral-800 rounded-lg p-6 flex flex-col items-center justify-center text-center"
				>
					<h2 class="text-3xl font-bold text-green-500 mb-6">How to Play</h2>
					<div class="text-neutral-300 text-xl space-y-4">
						<p>When a song starts, options will appear on your phone.</p>
						<p>Guess the correct artist as quickly as you can to earn more points!</p>
					</div>
				</div>
			{/if}
		{:else}
			<div class="w-full h-full flex items-center justify-center">
				<p class="text-neutral-500">Connecting to game state...</p>
			</div>
		{/if}
	</div>

	<!-- Bottom Control Bar RESTORED -->
	<div class="flex-shrink-0 pt-6">
		<div class="bg-neutral-800 rounded-lg p-3 max-w-md mx-auto flex justify-center gap-3">
			<button
				on:click={() => updateDashboardView('show_qr')}
				class="px-4 py-2 text-sm font-semibold rounded-md transition-colors"
				class:bg-green-600={gameState?.show_qr}
				class:bg-neutral-700={!gameState?.show_qr}
			>
				QR Code
			</button>
			<button
				on:click={() => updateDashboardView('show_leaderboard')}
				class="px-4 py-2 text-sm font-semibold rounded-md transition-colors"
				class:bg-green-600={gameState?.show_leaderboard}
				class:bg-neutral-700={!gameState?.show_leaderboard}
			>
				Leaderboard
			</button>
			<button
				on:click={() => updateDashboardView('show_instructions')}
				class="px-4 py-2 text-sm font-semibold rounded-md transition-colors"
				class:bg-green-600={gameState?.show_instructions}
				class:bg-neutral-700={!gameState?.show_instructions}
			>
				Instructions
			</button>
		</div>
	</div>
</div>


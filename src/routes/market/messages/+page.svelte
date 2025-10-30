<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import {
		getMarketItemConversations,
		getMarketItemUnreadCount,
		getCurrentUser,
		type MarketItemConversation,
		type CurrentUser
	} from '$lib/api';
	import { FontAwesomeIcon } from '@fortawesome/svelte-fontawesome';
	import { faChevronLeft, faEnvelope, faMessage } from '@fortawesome/free-solid-svg-icons';

	let conversations = $state<MarketItemConversation[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let unreadCount = $state(0);
	let currentUser = $state<CurrentUser | null>(null);

	async function load() {
		loading = true;
		error = null;
		try {
			const [convs, unread, user] = await Promise.all([
				getMarketItemConversations(),
				getMarketItemUnreadCount(),
				getCurrentUser()
			]);
			conversations = convs;
			unreadCount = unread.unread_count;
			currentUser = user;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to load conversations';
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		load();
	});

	function formatDateTime(iso: string): string {
		try {
			const d = new Date(iso);
			const now = new Date();
			const diffMs = now.getTime() - d.getTime();
			const diffMins = Math.floor(diffMs / 60000);
			const diffHours = Math.floor(diffMs / 3600000);
			const diffDays = Math.floor(diffMs / 86400000);

			if (diffMins < 1) return 'Just now';
			if (diffMins < 60) return `${diffMins}m ago`;
			if (diffHours < 24) return `${diffHours}h ago`;
			if (diffDays < 7) return `${diffDays}d ago`;

			return new Intl.DateTimeFormat(undefined, {
				month: 'short',
				day: 'numeric',
				year: diffDays >= 365 ? 'numeric' : undefined
			}).format(d);
		} catch {
			return iso;
		}
	}

	function getOtherParticipant(conv: MarketItemConversation): string {
		if (!currentUser) return 'Unknown';
		
		// Return the username of the other participant
		if (conv.participant1_id === currentUser.id) {
			return conv.participant2_username || 'Unknown';
		}
		return conv.participant1_username || 'Unknown';
	}
</script>

<div class="min-h-screen bg-gray-50 dark:bg-gray-900">
	<!-- Header -->
	<div class="sticky top-0 z-10 border-b border-gray-200 bg-white/80 backdrop-blur-lg dark:border-gray-700 dark:bg-gray-800/80">
		<div class="mx-auto max-w-4xl px-4 py-4">
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-3">
					<button
						onclick={() => goto('/market')}
						class="rounded-full p-2 transition hover:bg-gray-100 dark:hover:bg-gray-700"
						aria-label="Back to marketplace"
					>
						<FontAwesomeIcon icon={faChevronLeft} class="h-5 w-5" />
					</button>
					<h1 class="text-xl font-semibold text-gray-900 dark:text-white">Messages</h1>
					{#if unreadCount > 0}
						<span
							class="rounded-full bg-red-500 px-2 py-0.5 text-xs font-semibold text-white"
						>
							{unreadCount}
						</span>
					{/if}
				</div>
			</div>
		</div>
	</div>

	<!-- Content -->
	<div class="mx-auto max-w-4xl px-4 py-6">
		{#if loading}
			<div class="py-12 text-center">
				<p class="text-sm text-gray-500 dark:text-gray-400">Loading conversations...</p>
			</div>
		{:else if error}
			<div class="rounded-lg bg-red-50 p-4 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
				{error}
			</div>
		{:else if conversations.length === 0}
			<div class="py-12 text-center">
				<FontAwesomeIcon
					icon={faMessage}
					class="mx-auto mb-4 h-12 w-12 text-gray-400 dark:text-gray-600"
				/>
				<p class="text-sm font-medium text-gray-900 dark:text-white">No messages yet</p>
				<p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
					Start a conversation by messaging a seller about an item.
				</p>
			</div>
		{:else}
			<div class="space-y-2">
				{#each conversations as conv}
					<button
						onclick={() => goto(`/market/messages/${conv.id}`)}
						class="group w-full rounded-xl bg-white p-4 text-left shadow-sm ring-1 ring-gray-200 transition hover:shadow-md dark:bg-gray-800 dark:ring-gray-700"
					>
						<div class="flex items-start gap-3">
							<div
								class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
							>
								<FontAwesomeIcon icon={faEnvelope} class="h-6 w-6" />
							</div>
							<div class="min-w-0 flex-1">
								<div class="flex items-start justify-between gap-2">
									<div class="min-w-0 flex-1">
										<p class="truncate font-semibold text-gray-900 dark:text-white">
											{conv.item_name || 'Unknown Item'}
										</p>
										<p class="mt-0.5 text-sm text-gray-600 dark:text-gray-400">
											with {getOtherParticipant(conv)}
										</p>
									</div>
									{#if conv.unread_count && conv.unread_count > 0}
										<span
											class="shrink-0 rounded-full bg-blue-600 px-2 py-0.5 text-xs font-semibold text-white"
										>
											{conv.unread_count}
										</span>
									{/if}
								</div>
								{#if conv.last_message}
									<p
										class="mt-2 line-clamp-2 text-sm text-gray-600 dark:text-gray-400 {conv.last_message.is_read
											? ''
											: 'font-medium text-gray-900 dark:text-white'}"
									>
										{conv.last_message.content}
									</p>
									<p class="mt-1 text-xs text-gray-500 dark:text-gray-500">
										{formatDateTime(conv.last_message.created_at)}
									</p>
								{/if}
							</div>
						</div>
					</button>
				{/each}
			</div>
		{/if}
	</div>
</div>


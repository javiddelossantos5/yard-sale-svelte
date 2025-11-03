<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import {
		getYardSaleConversations,
		getMarketItemConversations,
		getYardSaleUnreadCount,
		getMarketItemUnreadCount,
		getCurrentUser,
		type YardSaleConversation,
		type MarketItemConversation,
		type CurrentUser
	} from '$lib/api';
	import { FontAwesomeIcon } from '@fortawesome/svelte-fontawesome';
	import {
		faChevronLeft,
		faEnvelope,
		faMessage,
		faStore,
		faArrowRight
	} from '@fortawesome/free-solid-svg-icons';

	let yardSaleConversations = $state<YardSaleConversation[]>([]);
	let marketItemConversations = $state<MarketItemConversation[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let yardSaleUnreadCount = $state(0);
	let marketItemUnreadCount = $state(0);
	let currentUser = $state<CurrentUser | null>(null);
	let activeTab = $state<'all' | 'yard-sales' | 'market'>('all');

	async function load() {
		loading = true;
		error = null;
		try {
			const [yardSaleConvs, marketConvs, yardSaleUnread, marketUnread, user] = await Promise.all([
				getYardSaleConversations(),
				getMarketItemConversations(),
				getYardSaleUnreadCount(),
				getMarketItemUnreadCount(),
				getCurrentUser()
			]);
			yardSaleConversations = yardSaleConvs;
			marketItemConversations = marketConvs;
			yardSaleUnreadCount = yardSaleUnread.unread_count;
			marketItemUnreadCount = marketUnread.unread_count;
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

	function getYardSaleOtherParticipant(conv: YardSaleConversation): string {
		if (!currentUser) return 'Unknown';
		if (conv.participant1_id === currentUser.id) {
			return conv.participant2_username || 'Unknown';
		}
		return conv.participant1_username || 'Unknown';
	}

	function getMarketItemOtherParticipant(conv: MarketItemConversation): string {
		if (!currentUser) return 'Unknown';
		if (conv.participant1_id === currentUser.id) {
			return conv.participant2_username || 'Unknown';
		}
		return conv.participant1_username || 'Unknown';
	}

	const totalUnreadCount = $derived(yardSaleUnreadCount + marketItemUnreadCount);
	type UnifiedConversation = (YardSaleConversation & { type: 'yard-sale' }) | 
	                            (MarketItemConversation & { type: 'market' });

	const filteredConversations = $derived(() => {
		if (activeTab === 'yard-sales') {
			return yardSaleConversations.map((c) => ({ ...c, type: 'yard-sale' as const })) as UnifiedConversation[];
		} else if (activeTab === 'market') {
			return marketItemConversations.map((c) => ({ ...c, type: 'market' as const })) as UnifiedConversation[];
		} else {
			// Combine and sort by updated_at
			const all: UnifiedConversation[] = [
				...yardSaleConversations.map((c) => ({ ...c, type: 'yard-sale' as const })),
				...marketItemConversations.map((c) => ({ ...c, type: 'market' as const }))
			];
			return all.sort(
				(a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
			);
		}
	});
</script>

<div class="min-h-screen bg-gray-50 dark:bg-gray-900">
	<!-- Header -->
	<div
		class="sticky top-0 z-10 border-b border-gray-200 bg-white/80 backdrop-blur-lg dark:border-gray-700 dark:bg-gray-800/80"
	>
		<div class="mx-auto max-w-4xl px-4 py-4">
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-3">
					<button
						onclick={() => goto('/')}
						class="rounded-full p-2 transition hover:bg-gray-100 dark:hover:bg-gray-700"
						aria-label="Back"
					>
						<FontAwesomeIcon icon={faChevronLeft} class="h-5 w-5" />
					</button>
					<h1 class="text-xl font-semibold text-gray-900 dark:text-white">Messages</h1>
					{#if totalUnreadCount > 0}
						<span class="rounded-full bg-red-500 px-2 py-0.5 text-xs font-semibold text-white">
							{totalUnreadCount}
						</span>
					{/if}
				</div>
			</div>
		</div>
	</div>

	<!-- Tabs -->
	<div class="border-b border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
		<div class="mx-auto max-w-4xl px-4">
			<div class="flex gap-2">
				<button
					onclick={() => (activeTab = 'all')}
					class="border-b-2 px-4 py-3 text-sm font-semibold transition-colors {activeTab === 'all'
						? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
						: 'border-transparent text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'}"
				>
					All ({yardSaleConversations.length + marketItemConversations.length})
				</button>
				<button
					onclick={() => (activeTab = 'yard-sales')}
					class="relative border-b-2 px-4 py-3 text-sm font-semibold transition-colors {activeTab ===
					'yard-sales'
						? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
						: 'border-transparent text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'}"
				>
					Yard Sales ({yardSaleConversations.length})
					{#if yardSaleUnreadCount > 0}
						<span
							class="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-semibold text-white"
						>
							{yardSaleUnreadCount > 99 ? '99+' : yardSaleUnreadCount}
						</span>
					{/if}
				</button>
				<button
					onclick={() => (activeTab = 'market')}
					class="relative border-b-2 px-4 py-3 text-sm font-semibold transition-colors {activeTab ===
					'market'
						? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
						: 'border-transparent text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'}"
				>
					Marketplace ({marketItemConversations.length})
					{#if marketItemUnreadCount > 0}
						<span
							class="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-semibold text-white"
						>
							{marketItemUnreadCount > 99 ? '99+' : marketItemUnreadCount}
						</span>
					{/if}
				</button>
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
			<div
				class="rounded-lg bg-red-50 p-4 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400"
			>
				{error}
			</div>
		{:else if filteredConversations().length === 0}
			<div class="py-12 text-center">
				<FontAwesomeIcon
					icon={faMessage}
					class="mx-auto mb-4 h-12 w-12 text-gray-400 dark:text-gray-600"
				/>
				<p class="text-sm font-medium text-gray-900 dark:text-white">No messages yet</p>
				<p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
					{activeTab === 'yard-sales'
						? 'Start a conversation by messaging a seller about a yard sale.'
						: activeTab === 'market'
							? 'Start a conversation by messaging a seller about an item.'
							: 'Start a conversation by messaging a seller about a yard sale or item.'}
				</p>
			</div>
		{:else}
			<div class="space-y-2">
				{#each filteredConversations() as conv}
					{@const isYardSale = conv.type === 'yard-sale'}
					{@const convId = conv.id}
					{@const route = isYardSale ? `/yard-sale/messages/${convId}` : `/market/messages/${convId}`}
					{@const otherParticipant = isYardSale
						? getYardSaleOtherParticipant(conv as YardSaleConversation)
						: getMarketItemOtherParticipant(conv as MarketItemConversation)}
					{@const title = isYardSale
						? (conv as YardSaleConversation).yard_sale_title || 'Unknown Yard Sale'
						: (conv as MarketItemConversation).item_name || 'Unknown Item'}
					{@const lastMessage = isYardSale
						? (conv as YardSaleConversation).last_message
						: (conv as MarketItemConversation).last_message}
					{@const unreadCount = conv.unread_count || 0}

					<div
						onclick={() => goto(route)}
						onkeydown={(e) => {
							if (e.key === 'Enter' || e.key === ' ') {
								e.preventDefault();
								goto(route);
							}
						}}
						role="button"
						tabindex="0"
						class="group w-full cursor-pointer rounded-xl bg-white p-4 text-left shadow-sm ring-1 ring-gray-200 transition hover:shadow-md dark:bg-gray-800 dark:ring-gray-700"
					>
						<div class="flex items-start gap-3">
							<div
								class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full {isYardSale
									? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
									: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400'}"
							>
								{#if isYardSale}
									<FontAwesomeIcon icon={faEnvelope} class="h-6 w-6" />
								{:else}
									<FontAwesomeIcon icon={faStore} class="h-6 w-6" />
								{/if}
							</div>
							<div class="min-w-0 flex-1">
								<div class="flex items-start justify-between gap-2">
									<div class="min-w-0 flex-1">
										<div class="flex items-center gap-2">
											<span
												class="inline-block rounded-full px-2 py-0.5 text-xs font-medium {isYardSale
													? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
													: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'}"
											>
												{isYardSale ? 'Yard Sale' : 'Marketplace'}
											</span>
											<span
												onclick={(e) => {
													e.stopPropagation();
													if (isYardSale) {
														goto(`/yard-sale/${(conv as YardSaleConversation).yard_sale_id}`);
													} else {
														goto(`/market/${(conv as MarketItemConversation).item_id}`);
													}
												}}
												class="cursor-pointer truncate font-semibold text-gray-900 transition hover:text-blue-600 dark:text-white dark:hover:text-blue-400"
												role="button"
												tabindex="0"
												onkeydown={(e) => {
													if (e.key === 'Enter' || e.key === ' ') {
														e.preventDefault();
														e.stopPropagation();
														if (isYardSale) {
															goto(`/yard-sale/${(conv as YardSaleConversation).yard_sale_id}`);
														} else {
															goto(`/market/${(conv as MarketItemConversation).item_id}`);
														}
													}
												}}
											>
												{title}
												<FontAwesomeIcon icon={faArrowRight} class="ml-2 inline h-3 w-3" />
											</span>
										</div>
										<span
											onclick={(e) => {
												e.stopPropagation();
												if (isYardSale) {
													const ysConv = conv as YardSaleConversation;
													goto(`/profile/${currentUser?.id === ysConv.participant1_id
														? ysConv.participant2_id
														: ysConv.participant1_id}`);
												} else {
													const miConv = conv as MarketItemConversation;
													goto(`/profile/${currentUser?.id === miConv.participant1_id
														? miConv.participant2_id
														: miConv.participant1_id}`);
												}
											}}
											class="mt-0.5 cursor-pointer text-sm text-gray-600 transition hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400"
											role="button"
											tabindex="0"
											onkeydown={(e) => {
												if (e.key === 'Enter' || e.key === ' ') {
													e.preventDefault();
													e.stopPropagation();
													if (isYardSale) {
														const ysConv = conv as YardSaleConversation;
														goto(`/profile/${currentUser?.id === ysConv.participant1_id
															? ysConv.participant2_id
															: ysConv.participant1_id}`);
													} else {
														const miConv = conv as MarketItemConversation;
														goto(`/profile/${currentUser?.id === miConv.participant1_id
															? miConv.participant2_id
															: miConv.participant1_id}`);
													}
												}
											}}
										>
											with {otherParticipant}
										</span>
									</div>
									{#if unreadCount > 0}
										<span
											class="shrink-0 rounded-full bg-blue-600 px-2 py-0.5 text-xs font-semibold text-white"
										>
											{unreadCount}
										</span>
									{/if}
								</div>
								{#if lastMessage}
									<p
										class="mt-2 line-clamp-2 text-sm text-gray-600 dark:text-gray-400 {lastMessage.is_read
											? ''
											: 'font-medium text-gray-900 dark:text-white'}"
									>
										{lastMessage.content}
									</p>
									<p class="mt-1 text-xs text-gray-500 dark:text-gray-500">
										{formatDateTime(lastMessage.created_at)}
									</p>
								{/if}
							</div>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>

<style>
	:global(.title-link:hover .title-link-icon) {
		color: rgb(37 99 235); /* blue-600 */
	}

	:global(.dark .title-link:hover .title-link-icon) {
		color: rgb(96 165 250); /* blue-400 */
	}
</style>


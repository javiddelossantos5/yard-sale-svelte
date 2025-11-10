<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import {
		getYardSaleConversations,
		getMarketItemConversations,
		getEventConversations,
		getYardSaleUnreadCount,
		getMarketItemUnreadCount,
		getEventUnreadCount,
		getCurrentUser,
		type YardSaleConversation,
		type MarketItemConversation,
		type EventConversation,
		type CurrentUser
	} from '$lib/api';
	import { FontAwesomeIcon } from '@fortawesome/svelte-fontawesome';
	import {
		faEnvelope,
		faMessage,
		faStore,
		faArrowRight,
		faHome,
		faHeart,
		faUser,
		faShieldAlt,
		faCalendar
	} from '@fortawesome/free-solid-svg-icons';
	import { logout } from '$lib/auth';
	import { unreadMessageCount } from '$lib/notifications';
	import AppHeader from '$lib/AppHeader.svelte';
	import { isAdmin } from '$lib/api';

	let yardSaleConversations = $state<YardSaleConversation[]>([]);
	let marketItemConversations = $state<MarketItemConversation[]>([]);
	let eventConversations = $state<EventConversation[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let yardSaleUnreadCount = $state(0);
	let marketItemUnreadCount = $state(0);
	let eventUnreadCount = $state(0);
	let currentUser = $state<CurrentUser | null>(null);

	// Initialize activeTab from URL query parameter
	let activeTab = $state<'all' | 'yard-sales' | 'market' | 'events'>('all');

	// React to URL changes
	$effect(() => {
		const tabParam = $page.url.searchParams.get('tab');
		if (
			tabParam === 'yard-sales' ||
			tabParam === 'market' ||
			tabParam === 'events' ||
			tabParam === 'all'
		) {
			activeTab = tabParam as 'all' | 'yard-sales' | 'market' | 'events';
		}
	});

	async function load() {
		loading = true;
		error = null;
		try {
			const [
				yardSaleConvs,
				marketConvs,
				eventConvs,
				yardSaleUnread,
				marketUnread,
				eventUnread,
				user
			] = await Promise.all([
				getYardSaleConversations(),
				getMarketItemConversations(),
				getEventConversations(),
				getYardSaleUnreadCount(),
				getMarketItemUnreadCount(),
				getEventUnreadCount(),
				getCurrentUser()
			]);
			yardSaleConversations = yardSaleConvs;
			marketItemConversations = marketConvs;
			eventConversations = eventConvs;
			yardSaleUnreadCount = yardSaleUnread.unread_count;
			marketItemUnreadCount = marketUnread.unread_count;
			eventUnreadCount = eventUnread.unread_count;
			currentUser = user;
		} catch (e) {
			// Don't show error for token expiration - handleTokenExpiration() will redirect
			if (e instanceof Error && e.message === 'Token expired') {
				// Silently handle - redirect will happen via handleTokenExpiration()
				return;
			}
			error = e instanceof Error ? e.message : 'Failed to load conversations';
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		// Check if we're in the middle of a logout redirect - if so, don't do anything
		if (
			typeof sessionStorage !== 'undefined' &&
			sessionStorage.getItem('logout_redirecting') === 'true'
		) {
			return;
		}

		// Set initial tab from URL
		const tabParam = $page.url.searchParams.get('tab');
		if (
			tabParam === 'yard-sales' ||
			tabParam === 'market' ||
			tabParam === 'events' ||
			tabParam === 'all'
		) {
			activeTab = tabParam as 'all' | 'yard-sales' | 'market' | 'events';
		}

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

	function getEventOtherParticipant(conv: EventConversation): string {
		if (!currentUser) return 'Unknown';
		if (conv.participant1_id === currentUser.id) {
			return conv.participant2_username || 'Unknown';
		}
		return conv.participant1_username || 'Unknown';
	}

	const totalUnreadCount = $derived(yardSaleUnreadCount + marketItemUnreadCount + eventUnreadCount);
	type UnifiedConversation =
		| (YardSaleConversation & { type: 'yard-sale' })
		| (MarketItemConversation & { type: 'market' })
		| (EventConversation & { type: 'event' });

	const filteredConversations = $derived(() => {
		if (activeTab === 'yard-sales') {
			return yardSaleConversations.map((c) => ({
				...c,
				type: 'yard-sale' as const
			})) as UnifiedConversation[];
		} else if (activeTab === 'market') {
			return marketItemConversations.map((c) => ({
				...c,
				type: 'market' as const
			})) as UnifiedConversation[];
		} else if (activeTab === 'events') {
			return eventConversations.map((c) => ({
				...c,
				type: 'event' as const
			})) as UnifiedConversation[];
		} else {
			// Combine and sort by updated_at
			const all: UnifiedConversation[] = [
				...yardSaleConversations.map((c) => ({ ...c, type: 'yard-sale' as const })),
				...marketItemConversations.map((c) => ({ ...c, type: 'market' as const })),
				...eventConversations.map((c) => ({ ...c, type: 'event' as const }))
			];
			return all.sort(
				(a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
			);
		}
	});

	function goToProfile() {
		if (currentUser) goto(`/profile/${currentUser.id}`);
	}

	function handleLogout() {
		logout(); // logout() now handles redirect automatically
	}

	// Build mobile menu items
	let mobileMenuItems = $derived.by(() => {
		const items: Array<{
			label: string;
			icon: any;
			action: () => void;
			badge?: number;
		}> = [];
		if (currentUser && isAdmin(currentUser)) {
			items.push({
				label: 'Admin',
				icon: faShieldAlt,
				action: () => {
					void goto('/admin');
				}
			});
		}
		if (currentUser) {
			items.push({
				label: 'Watched Items',
				icon: faHeart,
				action: () => {
					void goto('/market/watched');
				}
			});
			items.push({
				label: 'My Profile',
				icon: faUser,
				action: () => {
					goToProfile();
				}
			});
		}
		return items;
	});
</script>

<div class="min-h-screen bg-gray-50 dark:bg-gray-900">
	<AppHeader
		title="Messages"
		subtitle={totalUnreadCount > 0
			? `${totalUnreadCount} ${totalUnreadCount === 1 ? 'unread' : 'unread'}`
			: 'All conversations from yard sales, marketplace, and events'}
		showBackButton={true}
		backUrl="/"
		backLabel="Back"
		{currentUser}
		marketMessageUnreadCount={marketItemUnreadCount}
		yardSaleMessageUnreadCount={yardSaleUnreadCount}
		eventMessageUnreadCount={eventUnreadCount}
		{mobileMenuItems}
	/>

	<!-- Tabs -->
	<div class="border-b border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
		<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
			<div class="flex gap-2 py-2">
				<button
					onclick={() => {
						activeTab = 'all';
						goto('/messages?tab=all', { replaceState: true, noScroll: true });
					}}
					class="border-b-2 px-4 py-3 text-sm font-semibold transition-colors {activeTab === 'all'
						? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
						: 'border-transparent text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'}"
				>
					All ({yardSaleConversations.length +
						marketItemConversations.length +
						eventConversations.length})
				</button>
				<button
					onclick={() => {
						activeTab = 'yard-sales';
						goto('/messages?tab=yard-sales', { replaceState: true, noScroll: true });
					}}
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
					onclick={() => {
						activeTab = 'market';
						goto('/messages?tab=market', { replaceState: true, noScroll: true });
					}}
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
				<button
					onclick={() => {
						activeTab = 'events';
						goto('/messages?tab=events', { replaceState: true, noScroll: true });
					}}
					class="relative border-b-2 px-4 py-3 text-sm font-semibold transition-colors {activeTab ===
					'events'
						? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
						: 'border-transparent text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'}"
				>
					Events ({eventConversations.length})
					{#if eventUnreadCount > 0}
						<span
							class="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-semibold text-white"
						>
							{eventUnreadCount > 99 ? '99+' : eventUnreadCount}
						</span>
					{/if}
				</button>
			</div>
		</div>
	</div>

	<!-- Content -->
	<div class="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
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
							: activeTab === 'events'
								? 'Start a conversation by messaging an event organizer.'
								: 'Start a conversation by messaging a seller or event organizer.'}
				</p>
			</div>
		{:else}
			<div class="space-y-2">
				{#each filteredConversations() as conv}
					{@const isYardSale = conv.type === 'yard-sale'}
					{@const isMarket = conv.type === 'market'}
					{@const isEvent = conv.type === 'event'}
					{@const convId = conv.id}
					{@const route = isYardSale
						? `/yard-sale/messages/${convId}`
						: isMarket
							? `/market/messages/${convId}`
							: `/events/messages/${convId}`}
					{@const otherParticipant = isYardSale
						? getYardSaleOtherParticipant(conv as YardSaleConversation)
						: isMarket
							? getMarketItemOtherParticipant(conv as MarketItemConversation)
							: getEventOtherParticipant(conv as EventConversation)}
					{@const title = isYardSale
						? (conv as YardSaleConversation).yard_sale_title || 'Unknown Yard Sale'
						: isMarket
							? (conv as MarketItemConversation).item_name || 'Unknown Item'
							: (conv as EventConversation).event_title || 'Unknown Event'}
					{@const lastMessage = isYardSale
						? (conv as YardSaleConversation).last_message
						: isMarket
							? (conv as MarketItemConversation).last_message
							: (conv as EventConversation).last_message}
					{@const unreadCount = conv.unread_count || 0}

					<div
						onclick={(e) => {
							e.preventDefault();
							e.stopPropagation();
							console.log('Navigating to:', route);
							goto(route);
						}}
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
									: isMarket
										? 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400'
										: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'}"
							>
								{#if isYardSale}
									<FontAwesomeIcon icon={faEnvelope} class="h-6 w-6" />
								{:else if isMarket}
									<FontAwesomeIcon icon={faStore} class="h-6 w-6" />
								{:else}
									<FontAwesomeIcon icon={faCalendar} class="h-6 w-6" />
								{/if}
							</div>
							<div class="min-w-0 flex-1">
								<div class="flex items-start justify-between gap-2">
									<div class="min-w-0 flex-1">
										<div class="flex items-center gap-2">
											<span
												class="inline-block rounded-full px-2 py-0.5 text-xs font-medium {isYardSale
													? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
													: isMarket
														? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
														: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'}"
											>
												{isYardSale ? 'Yard Sale' : isMarket ? 'Marketplace' : 'Event'}
											</span>
											<span
												onclick={(e) => {
													e.stopPropagation();
													if (isYardSale) {
														goto(`/yard-sale/${(conv as YardSaleConversation).yard_sale_id}`);
													} else if (isMarket) {
														goto(`/market/${(conv as MarketItemConversation).item_id}`);
													} else {
														goto(`/events/${(conv as EventConversation).event_id}`);
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
														} else if (isMarket) {
															goto(`/market/${(conv as MarketItemConversation).item_id}`);
														} else {
															goto(`/events/${(conv as EventConversation).event_id}`);
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
													goto(
														`/profile/${
															currentUser?.id === ysConv.participant1_id
																? ysConv.participant2_id
																: ysConv.participant1_id
														}`
													);
												} else if (isMarket) {
													const miConv = conv as MarketItemConversation;
													goto(
														`/profile/${
															currentUser?.id === miConv.participant1_id
																? miConv.participant2_id
																: miConv.participant1_id
														}`
													);
												} else {
													const evConv = conv as EventConversation;
													goto(
														`/profile/${
															currentUser?.id === evConv.participant1_id
																? evConv.participant2_id
																: evConv.participant1_id
														}`
													);
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
														goto(
															`/profile/${
																currentUser?.id === ysConv.participant1_id
																	? ysConv.participant2_id
																	: ysConv.participant1_id
															}`
														);
													} else if (isMarket) {
														const miConv = conv as MarketItemConversation;
														goto(
															`/profile/${
																currentUser?.id === miConv.participant1_id
																	? miConv.participant2_id
																	: miConv.participant1_id
															}`
														);
													} else {
														const evConv = conv as EventConversation;
														goto(
															`/profile/${
																currentUser?.id === evConv.participant1_id
																	? evConv.participant2_id
																	: evConv.participant1_id
															}`
														);
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

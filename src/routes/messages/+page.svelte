<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
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
		faArrowRight,
		faBars,
		faHome,
		faHeart,
		faUser,
		faArrowRightFromBracket
	} from '@fortawesome/free-solid-svg-icons';
	import { logout } from '$lib/auth';
	import { unreadMessageCount } from '$lib/notifications';

	let mobileMenuOpen = $state(false);
	let yardSaleConversations = $state<YardSaleConversation[]>([]);
	let marketItemConversations = $state<MarketItemConversation[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let yardSaleUnreadCount = $state(0);
	let marketItemUnreadCount = $state(0);
	let currentUser = $state<CurrentUser | null>(null);

	// Initialize activeTab from URL query parameter
	let activeTab = $state<'all' | 'yard-sales' | 'market'>('all');

	// React to URL changes
	$effect(() => {
		const tabParam = $page.url.searchParams.get('tab');
		if (tabParam === 'yard-sales' || tabParam === 'market' || tabParam === 'all') {
			activeTab = tabParam;
		}
	});

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
		if (tabParam === 'yard-sales' || tabParam === 'market' || tabParam === 'all') {
			activeTab = tabParam;
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

	const totalUnreadCount = $derived(yardSaleUnreadCount + marketItemUnreadCount);
	type UnifiedConversation =
		| (YardSaleConversation & { type: 'yard-sale' })
		| (MarketItemConversation & { type: 'market' });

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

	function goToProfile() {
		if (currentUser) goto(`/profile/${currentUser.id}`);
	}

	function handleLogout() {
		logout(); // logout() now handles redirect automatically
	}
</script>

<div class="min-h-screen bg-gray-50 dark:bg-gray-900">
	<!-- Header -->
	<header
		class="sticky top-0 z-50 border-b border-gray-200/80 bg-white/80 backdrop-blur-xl dark:border-gray-800/80 dark:bg-gray-900/80"
	>
		<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
			<!-- Mobile Layout -->
			<div class="block sm:hidden">
				<div class="flex h-16 items-center justify-between">
					<!-- Logo and Title -->
					<div class="flex items-center space-x-3">
						<button
							onclick={() => goto('/')}
							class="shrink-0 rounded-full p-1.5 transition hover:bg-gray-100 dark:hover:bg-gray-700"
							aria-label="Back"
						>
							<FontAwesomeIcon icon={faChevronLeft} class="h-5 w-5" />
						</button>
						<button
							onclick={() => goto('/')}
							class="shrink-0 rounded-lg transition-opacity hover:opacity-80 active:scale-95"
							aria-label="Go to home"
						>
							<img
								src="/icon2.png"
								alt="Yard Sale Finder Logo"
								class="h-8 w-8 rounded-lg object-cover"
							/>
						</button>
						<div>
							<h1 class="text-lg font-semibold text-gray-900 dark:text-white">Messages</h1>
							{#if totalUnreadCount > 0}
								<p class="text-xs text-gray-500 dark:text-gray-400">
									{totalUnreadCount}
									{totalUnreadCount === 1 ? 'unread' : 'unread'}
								</p>
							{:else}
								<p class="text-xs text-gray-500 dark:text-gray-400">All conversations</p>
							{/if}
						</div>
					</div>

					<!-- Right side: Menu button -->
					<div class="flex items-center gap-2">
						<button
							onclick={() => (mobileMenuOpen = !mobileMenuOpen)}
							class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 transition-all duration-200 hover:bg-gray-200 active:scale-95 dark:bg-gray-800 dark:hover:bg-gray-700"
							aria-label="Menu"
						>
							<FontAwesomeIcon icon={faBars} class="h-5 w-5 text-gray-700 dark:text-gray-300" />
						</button>
					</div>
				</div>

				<!-- Mobile Menu Dropdown -->
				{#if mobileMenuOpen}
					<div class="border-t border-gray-200 pt-4 pb-4 dark:border-gray-800">
						<div class="space-y-1">
							<button
								onclick={() => {
									goto('/');
									mobileMenuOpen = false;
								}}
								class="flex w-full items-center rounded-xl px-4 py-3 text-left text-base font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
							>
								<FontAwesomeIcon
									icon={faHome}
									class="mr-3 h-5 w-5 text-gray-500 dark:text-gray-400"
								/>
								Home
							</button>
							<button
								onclick={() => {
									goto('/market');
									mobileMenuOpen = false;
								}}
								class="flex w-full items-center rounded-xl px-4 py-3 text-left text-base font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
							>
								<FontAwesomeIcon
									icon={faStore}
									class="mr-3 h-5 w-5 text-gray-500 dark:text-gray-400"
								/>
								Marketplace
							</button>
							{#if currentUser}
								<button
									onclick={() => {
										goto('/market/watched');
										mobileMenuOpen = false;
									}}
									class="flex w-full items-center rounded-xl px-4 py-3 text-left text-base font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
								>
									<FontAwesomeIcon
										icon={faHeart}
										class="mr-3 h-5 w-5 text-gray-500 dark:text-gray-400"
									/>
									Watched Items
								</button>
								<button
									onclick={() => {
										goToProfile();
										mobileMenuOpen = false;
									}}
									class="relative flex w-full items-center rounded-xl px-4 py-3 text-left text-base font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
								>
									<FontAwesomeIcon
										icon={faUser}
										class="mr-3 h-5 w-5 text-gray-500 dark:text-gray-400"
									/>
									My Profile
									{#if $unreadMessageCount > 0}
										<span
											class="ml-auto rounded-full bg-red-500 px-2.5 py-0.5 text-sm font-semibold text-white"
										>
											{$unreadMessageCount > 99 ? '99+' : $unreadMessageCount}
										</span>
									{/if}
								</button>
							{/if}
							<button
								onclick={() => {
									handleLogout();
									mobileMenuOpen = false;
								}}
								class="flex w-full items-center rounded-xl px-4 py-3 text-left text-base font-medium text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
							>
								<FontAwesomeIcon icon={faArrowRightFromBracket} class="mr-3 h-5 w-5" />
								Logout
							</button>
						</div>
					</div>
				{/if}
			</div>

			<!-- Desktop Layout -->
			<div class="hidden sm:block">
				<div class="flex h-20 items-center justify-between">
					<!-- Left: Logo and Title -->
					<div class="flex items-center space-x-4">
						<button
							onclick={() => goto('/')}
							class="shrink-0 rounded-full p-2 transition hover:bg-gray-100 dark:hover:bg-gray-700"
							aria-label="Back"
						>
							<FontAwesomeIcon icon={faChevronLeft} class="h-5 w-5" />
						</button>
						<button
							onclick={() => goto('/')}
							class="shrink-0 rounded-xl transition-opacity hover:opacity-80 active:scale-95"
							aria-label="Go to home"
						>
							<img
								src="/icon2.png"
								alt="Yard Sale Finder Logo"
								class="h-12 w-12 rounded-xl object-cover shadow-sm"
							/>
						</button>
						<div>
							<h1 class="text-2xl font-bold text-gray-900 dark:text-white">Messages</h1>
							<div class="mt-0.5 flex items-center gap-3">
								<p class="text-sm text-gray-600 dark:text-gray-400">
									All conversations from yard sales and marketplace
								</p>
								{#if totalUnreadCount > 0}
									<span class="text-xs text-gray-500 dark:text-gray-500">
										• {totalUnreadCount}
										{totalUnreadCount === 1 ? 'unread' : 'unread'}
									</span>
								{/if}
							</div>
						</div>
					</div>

					<!-- Right: Actions -->
					<div class="flex items-center gap-3">
						<!-- Secondary Actions -->
						<div class="flex items-center gap-2">
							<button
								onclick={() => goto('/')}
								class="flex items-center rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-semibold text-gray-700 transition-all duration-200 hover:bg-gray-200 active:scale-95 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
							>
								<FontAwesomeIcon icon={faHome} class="mr-2 h-4 w-4" />
								Home
							</button>
							<button
								onclick={() => goto('/market')}
								class="flex items-center rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-semibold text-gray-700 transition-all duration-200 hover:bg-gray-200 active:scale-95 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
							>
								<FontAwesomeIcon icon={faStore} class="mr-2 h-4 w-4" />
								Marketplace
							</button>
							{#if currentUser}
								<button
									onclick={() => goto('/market/watched')}
									class="flex items-center rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-semibold text-gray-700 transition-all duration-200 hover:bg-gray-200 active:scale-95 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
								>
									<FontAwesomeIcon icon={faHeart} class="mr-2 h-4 w-4" />
									Watched
								</button>
								<button
									onclick={goToProfile}
									class="relative flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 transition-all duration-200 hover:bg-gray-200 active:scale-95 dark:bg-gray-800 dark:hover:bg-gray-700"
									aria-label="My Profile"
								>
									<FontAwesomeIcon icon={faUser} class="h-5 w-5 text-gray-700 dark:text-gray-200" />
									{#if $unreadMessageCount > 0}
										<span
											class="absolute -top-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-red-500 text-xs font-semibold text-white dark:border-gray-900"
										>
											{$unreadMessageCount > 99 ? '99+' : $unreadMessageCount}
										</span>
									{/if}
								</button>
							{/if}
							<button
								onclick={handleLogout}
								class="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-700 transition-all duration-200 hover:bg-gray-200 active:scale-95 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
								aria-label="Logout"
							>
								<FontAwesomeIcon icon={faArrowRightFromBracket} class="h-5 w-5" />
							</button>
						</div>
					</div>
				</div>
			</div>
		</div>
	</header>

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
					All ({yardSaleConversations.length + marketItemConversations.length})
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
							: 'Start a conversation by messaging a seller about a yard sale or item.'}
				</p>
			</div>
		{:else}
			<div class="space-y-2">
				{#each filteredConversations() as conv}
					{@const isYardSale = conv.type === 'yard-sale'}
					{@const convId = conv.id}
					{@const route = isYardSale
						? `/yard-sale/messages/${convId}`
						: `/market/messages/${convId}`}
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
													goto(
														`/profile/${
															currentUser?.id === ysConv.participant1_id
																? ysConv.participant2_id
																: ysConv.participant1_id
														}`
													);
												} else {
													const miConv = conv as MarketItemConversation;
													goto(
														`/profile/${
															currentUser?.id === miConv.participant1_id
																? miConv.participant2_id
																: miConv.participant1_id
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
													} else {
														const miConv = conv as MarketItemConversation;
														goto(
															`/profile/${
																currentUser?.id === miConv.participant1_id
																	? miConv.participant2_id
																	: miConv.participant1_id
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

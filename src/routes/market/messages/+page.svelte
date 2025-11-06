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
	import {
		faEnvelope,
		faMessage,
		faArrowRight,
		faBars,
		faHome,
		faUser,
		faArrowRightFromBracket,
		faStore,
		faChevronLeft,
		faHeart
	} from '@fortawesome/free-solid-svg-icons';
	import { logout } from '$lib/auth';
	import { unreadMessageCount } from '$lib/notifications';

	let mobileMenuOpen = $state(false);
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
			// Sort conversations: unread messages first, then by updated_at descending
			conversations = [...convs].sort((a, b) => {
				const aUnread = a.unread_count || 0;
				const bUnread = b.unread_count || 0;
				// If one has unread and the other doesn't, prioritize unread
				if (aUnread > 0 && bUnread === 0) return -1;
				if (aUnread === 0 && bUnread > 0) return 1;
				// If both have unread or both don't, sort by updated_at descending
				const aDate = new Date(a.updated_at || a.created_at || 0).getTime();
				const bDate = new Date(b.updated_at || b.created_at || 0).getTime();
				return bDate - aDate;
			});
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
							onclick={() => goto('/market')}
							class="rounded-full p-1.5 transition hover:bg-gray-100 dark:hover:bg-gray-700"
							aria-label="Back to marketplace"
						>
							<FontAwesomeIcon icon={faChevronLeft} class="h-5 w-5" />
						</button>
						<button
							onclick={() => goto('/')}
							class="rounded-lg transition-opacity hover:opacity-80 active:scale-95"
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
							{#if unreadCount > 0}
								<p class="text-xs text-gray-500 dark:text-gray-400">
									{unreadCount}
									{unreadCount === 1 ? 'unread' : 'unread'}
								</p>
							{:else}
								<p class="text-xs text-gray-500 dark:text-gray-400">Marketplace messages</p>
							{/if}
						</div>
					</div>

					<!-- Right side: Menu button -->
					<div class="flex items-center gap-2">
						<button
							onclick={() => (mobileMenuOpen = !mobileMenuOpen)}
							class="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 transition-all duration-200 hover:bg-gray-200 active:scale-95 dark:bg-gray-800 dark:hover:bg-gray-700"
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
							onclick={() => goto('/market')}
							class="rounded-full p-2 transition hover:bg-gray-100 dark:hover:bg-gray-700"
							aria-label="Back to marketplace"
						>
							<FontAwesomeIcon icon={faChevronLeft} class="h-5 w-5" />
						</button>
						<button
							onclick={() => goto('/')}
							class="rounded-xl transition-opacity hover:opacity-80 active:scale-95"
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
								<p class="text-sm text-gray-600 dark:text-gray-400">Marketplace conversations</p>
								{#if unreadCount > 0}
									<span class="text-xs text-gray-500 dark:text-gray-500">
										• {unreadCount}
										{unreadCount === 1 ? 'unread' : 'unread'}
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
					<div
						onclick={() => goto(`/market/messages/${conv.id}`)}
						onkeydown={(e) => {
							if (e.key === 'Enter' || e.key === ' ') {
								e.preventDefault();
								goto(`/market/messages/${conv.id}`);
							}
						}}
						role="button"
						tabindex="0"
						class="group w-full cursor-pointer rounded-xl bg-white p-4 text-left shadow-sm ring-1 ring-gray-200 transition hover:shadow-md dark:bg-gray-800 dark:ring-gray-700"
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
										<span
											onclick={(e) => {
												e.stopPropagation();
												if (conv.item_id) {
													goto(`/market/${conv.item_id}`);
												}
											}}
											onkeydown={(e) => {
												if (e.key === 'Enter' || e.key === ' ') {
													e.preventDefault();
													e.stopPropagation();
													if (conv.item_id) {
														goto(`/market/${conv.item_id}`);
													}
												}
											}}
											class="title-link inline-flex cursor-pointer items-center gap-2 truncate font-semibold text-gray-900 transition hover:text-blue-600 dark:text-white dark:hover:text-blue-400"
											role="button"
											tabindex="0"
										>
											<span class="truncate">{conv.item_name || 'Unknown Item'}</span>
											{#if conv.item_id}
												<FontAwesomeIcon
													icon={faArrowRight}
													class="title-link-icon h-3 w-3 shrink-0 text-gray-400 transition dark:text-gray-500"
												/>
											{/if}
										</span>
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
										class="mt-2 line-clamp-2 text-sm text-gray-600 dark:text-gray-400 {conv
											.last_message.is_read
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

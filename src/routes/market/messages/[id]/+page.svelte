<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import {
		getMarketItemConversationMessages,
		sendMarketItemConversationMessage,
		markMarketItemMessageRead,
		getMarketItemConversations,
		getCurrentUser,
		type MarketItemMessage,
		type CurrentUser
	} from '$lib/api';
	import { FontAwesomeIcon } from '@fortawesome/svelte-fontawesome';
	import {
		faChevronLeft,
		faPaperPlane,
		faUser,
		faArrowRight,
		faBars,
		faHome,
		faStore,
		faHeart,
		faMessage,
		faArrowRightFromBracket
	} from '@fortawesome/free-solid-svg-icons';
	import { logout } from '$lib/auth';
	import { unreadMessageCount } from '$lib/notifications';

	const conversationId = $derived($page.params.id);
	const backUrl = $derived('/messages?tab=market');

	let mobileMenuOpen = $state(false);
	let messages = $state<MarketItemMessage[]>([]);
	let conversation = $state<{ item_name?: string; item_id?: string } | null>(null);
	let loading = $state(false); // Start as false - only set to true after auth check
	let error = $state<string | null>(null);
	let newMessage = $state('');
	let sending = $state(false);
	let currentUser = $state<CurrentUser | null>(null);
	let isAuthenticated = $state(false); // Track auth status

	async function load() {
		if (!conversationId) return;

		loading = true;
		error = null;
		try {
			const [msgs, user, convs] = await Promise.all([
				getMarketItemConversationMessages(conversationId),
				getCurrentUser(),
				getMarketItemConversations()
			]);
			messages = msgs;
			currentUser = user;

			// Find the conversation to get item name and ID
			const conv = convs.find((c) => c.id === conversationId);
			if (conv) {
				conversation = {
					item_name: conv.item_name,
					item_id: conv.item_id
				};
			}

			// Mark unread messages as read
			const unreadMessages = msgs.filter((m) => !m.is_read && m.recipient_id === user?.id);
			for (const msg of unreadMessages) {
				try {
					await markMarketItemMessageRead(msg.id);
				} catch {
					// Ignore errors marking as read
				}
			}
		} catch (e) {
			// Don't show error for token expiration - handleTokenExpiration() will redirect
			if (e instanceof Error && e.message === 'Token expired') {
				// Silently handle - redirect will happen via handleTokenExpiration()
				return;
			}
			error = e instanceof Error ? e.message : 'Failed to load messages';
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		// Check if we're in the middle of a logout redirect - if so, redirect immediately
		if (
			typeof sessionStorage !== 'undefined' &&
			sessionStorage.getItem('logout_redirecting') === 'true'
		) {
			if (typeof window !== 'undefined') {
				window.location.replace('/login');
			}
			return;
		}

		// Check if user is logged in before loading
		if (typeof window !== 'undefined') {
			const token = localStorage.getItem('access_token');
			if (!token) {
				// Not logged in, redirect immediately
				window.location.replace('/login');
				return;
			}
			// User is authenticated, set flag and start loading
			isAuthenticated = true;
			loading = true;
		}
		load();
	});

	async function sendMessage() {
		if (!conversationId || !newMessage.trim() || sending) return;

		sending = true;
		error = null;
		try {
			const sentMessage = await sendMarketItemConversationMessage(
				conversationId,
				newMessage.trim()
			);
			messages = [...messages, sentMessage];
			newMessage = '';
			// Scroll to bottom
			setTimeout(() => {
				const container = document.getElementById('messages-container');
				if (container) {
					container.scrollTop = container.scrollHeight;
				}
			}, 100);
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to send message';
		} finally {
			sending = false;
		}
	}

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
				hour: 'numeric',
				minute: '2-digit',
				year: diffDays >= 365 ? 'numeric' : undefined
			}).format(d);
		} catch {
			return iso;
		}
	}

	const isMyMessage = (message: MarketItemMessage) =>
		currentUser && message.sender_id === currentUser.id;

	function goToProfile() {
		if (currentUser) goto(`/profile/${currentUser.id}`);
	}

	function handleLogout() {
		logout(); // logout() now handles redirect automatically
	}
</script>

<div class="flex h-screen flex-col bg-gray-50 dark:bg-gray-900">
	<!-- Header -->
	<header
		class="sticky top-0 z-50 border-b border-gray-200/80 bg-white/80 backdrop-blur-xl dark:border-gray-800/80 dark:bg-gray-900/80"
	>
		<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
			<!-- Mobile Layout -->
			<div class="block sm:hidden">
				<div class="flex h-16 items-center justify-between">
					<div class="flex min-w-0 flex-1 items-center space-x-3">
						<button
							onclick={() => goto(backUrl)}
							class="shrink-0 rounded-full p-1.5 transition hover:bg-gray-100 dark:hover:bg-gray-700"
							aria-label="Back to messages"
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
						<div class="min-w-0 flex-1">
							{#if conversation?.item_id}
								<button
									onclick={() => {
										if (conversation?.item_id) {
											goto(`/market/${conversation.item_id}`);
										}
									}}
									class="group inline-flex items-center gap-2 text-left transition hover:text-blue-600 dark:hover:text-blue-400"
								>
									<h1 class="truncate text-lg font-semibold text-gray-900 dark:text-white">
										{conversation.item_name || 'Conversation'}
									</h1>
									<FontAwesomeIcon
										icon={faArrowRight}
										class="h-3 w-3 shrink-0 text-gray-400 transition group-hover:text-blue-600 dark:text-gray-500 dark:group-hover:text-blue-400"
									/>
								</button>
							{:else}
								<h1 class="truncate text-lg font-semibold text-gray-900 dark:text-white">
									{conversation?.item_name || 'Conversation'}
								</h1>
							{/if}
						</div>
					</div>
					<button
						onclick={() => (mobileMenuOpen = !mobileMenuOpen)}
						class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 transition-all duration-200 hover:bg-gray-200 active:scale-95 dark:bg-gray-800 dark:hover:bg-gray-700"
						aria-label="Menu"
					>
						<FontAwesomeIcon icon={faBars} class="h-5 w-5 text-gray-700 dark:text-gray-300" />
					</button>
				</div>
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
										goto('/market/messages');
										mobileMenuOpen = false;
									}}
									class="flex w-full items-center rounded-xl px-4 py-3 text-left text-base font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
								>
									<FontAwesomeIcon
										icon={faMessage}
										class="mr-3 h-5 w-5 text-gray-500 dark:text-gray-400"
									/>
									Messages
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
					<div class="flex min-w-0 flex-1 items-center space-x-4">
						<button
							onclick={() => goto(backUrl)}
							class="shrink-0 rounded-full p-2 transition hover:bg-gray-100 dark:hover:bg-gray-700"
							aria-label="Back to messages"
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
						<div class="min-w-0 flex-1">
							{#if conversation?.item_id}
								<button
									onclick={() => {
										if (conversation?.item_id) {
											goto(`/market/${conversation.item_id}`);
										}
									}}
									class="group inline-flex items-center gap-2 text-left transition hover:text-blue-600 dark:hover:text-blue-400"
								>
									<h1 class="truncate text-2xl font-bold text-gray-900 dark:text-white">
										{conversation.item_name || 'Conversation'}
									</h1>
									<FontAwesomeIcon
										icon={faArrowRight}
										class="h-4 w-4 shrink-0 text-gray-400 transition group-hover:text-blue-600 dark:text-gray-500 dark:group-hover:text-blue-400"
									/>
								</button>
							{:else}
								<h1 class="truncate text-2xl font-bold text-gray-900 dark:text-white">
									{conversation?.item_name || 'Conversation'}
								</h1>
							{/if}
						</div>
					</div>
					<div class="flex shrink-0 items-center gap-3">
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
	<!-- Messages -->
	<div
		class="mx-auto w-full flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8"
		id="messages-container"
	>
		{#if !isAuthenticated}
			<!-- Don't show anything if not authenticated - redirect is happening -->
		{:else if loading}
			<div class="flex h-full items-center justify-center">
				<p class="text-sm text-gray-500 dark:text-gray-400">Loading messages...</p>
			</div>
		{:else if error}
			<div
				class="rounded-lg bg-red-50 p-4 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400"
			>
				{error}
			</div>
		{:else if messages.length === 0}
			<div class="flex h-full items-center justify-center">
				<p class="text-sm text-gray-500 dark:text-gray-400">No messages yet</p>
			</div>
		{:else}
			<div class="mx-auto max-w-4xl space-y-6">
				{#each messages as message}
					<div class="flex gap-4 {isMyMessage(message) ? 'flex-row-reverse' : 'flex-row'}">
						<div
							class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full {isMyMessage(
								message
							)
								? 'bg-blue-600 text-white'
								: 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300'}"
						>
							<FontAwesomeIcon icon={faUser} class="h-5 w-5" />
						</div>
						<div
							class="max-w-[85%] rounded-2xl px-5 py-3 shadow-sm {isMyMessage(message)
								? 'bg-blue-600 text-white'
								: 'bg-white text-gray-900 ring-1 ring-gray-200 dark:bg-gray-800 dark:text-white dark:ring-gray-700'}"
						>
							<p class="text-sm font-semibold">
								{message.sender_username || 'Unknown'}
							</p>
							<p class="mt-1.5 text-[15px] leading-relaxed">{message.content}</p>
							<p
								class="mt-2 text-xs {isMyMessage(message)
									? 'text-blue-100'
									: 'text-gray-500 dark:text-gray-400'}"
							>
								{formatDateTime(message.created_at)}
							</p>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>

	<!-- Message Input -->
	<div
		class="border-t border-gray-200 bg-white/80 backdrop-blur-lg dark:border-gray-700 dark:bg-gray-800/80"
	>
		<div class="mx-auto max-w-4xl px-4 py-4 sm:px-6 lg:px-8">
			{#if error}
				<div
					class="mb-3 rounded-lg bg-red-50 p-2 text-xs text-red-600 dark:bg-red-900/20 dark:text-red-400"
				>
					{error}
				</div>
			{/if}
			<form
				onsubmit={(e) => {
					e.preventDefault();
					sendMessage();
				}}
				class="flex gap-2"
			>
				<input
					type="text"
					bind:value={newMessage}
					placeholder="Type a message..."
					disabled={sending}
					class="flex-1 rounded-xl border-0 bg-gray-100 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-500 ring-1 ring-gray-300 transition focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:ring-gray-600"
				/>
				<button
					type="submit"
					disabled={sending || !newMessage.trim()}
					class="rounded-xl bg-blue-600 px-4 py-2.5 text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
				>
					<FontAwesomeIcon icon={faPaperPlane} class="h-4 w-4" />
				</button>
			</form>
		</div>
	</div>
</div>

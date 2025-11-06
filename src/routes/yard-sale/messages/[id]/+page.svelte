<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import {
		getYardSaleConversationMessages,
		sendYardSaleConversationMessage,
		markYardSaleMessageRead,
		getYardSaleConversations,
		getCurrentUser,
		type Message,
		type CurrentUser
	} from '$lib/api';
	import { FontAwesomeIcon } from '@fortawesome/svelte-fontawesome';
	import {
		faChevronLeft,
		faPaperPlane,
		faUser,
		faArrowRight
	} from '@fortawesome/free-solid-svg-icons';

	const conversationId = $derived($page.params.id);
	const backUrl = $derived('/messages?tab=yard-sales');

	let messages = $state<Message[]>([]);
	let conversation = $state<{ yard_sale_title?: string; yard_sale_id?: string } | null>(null);
	let loading = $state(false); // Start as false - only set to true after auth check
	let error = $state<string | null>(null);
	let newMessage = $state('');
	let sending = $state(false);
	let currentUser = $state<CurrentUser | null>(null);
	let isAuthenticated = $state(false); // Track auth status

	async function load() {
		if (!conversationId) {
			console.warn('No conversationId found');
			return;
		}

		console.log('Loading conversation messages for ID:', conversationId);
		loading = true;
		error = null;
		try {
			console.log('Making API calls...');
			const [msgs, user, convs] = await Promise.all([
				getYardSaleConversationMessages(conversationId),
				getCurrentUser(),
				getYardSaleConversations()
			]);
			console.log('API calls completed. Messages:', msgs.length);
			messages = msgs;
			currentUser = user;

			// Find the conversation to get yard sale title and ID
			const conv = convs.find((c) => c.id === conversationId);
			if (conv) {
				conversation = {
					yard_sale_title: conv.yard_sale_title,
					yard_sale_id: conv.yard_sale_id
				};
			}

			// Mark unread messages as read
			const unreadMessages = msgs.filter((m) => !m.is_read && m.recipient_id === user?.id);
			for (const msg of unreadMessages) {
				try {
					await markYardSaleMessageRead(msg.id);
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

	// React to conversationId changes (runs on mount and when conversationId changes)
	$effect(() => {
		// Check if we're in the middle of a logout redirect - if so, redirect immediately
		if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('logout_redirecting') === 'true') {
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
			if (!isAuthenticated) {
				isAuthenticated = true;
				loading = true;
			}
		}
		
		if (conversationId) {
			console.log('Loading conversation for ID:', conversationId);
			load();
		} else {
			console.warn('No conversationId available');
		}
	});

	async function sendMessage() {
		if (!conversationId || !newMessage.trim() || sending) return;

		sending = true;
		error = null;
		try {
			const sentMessage = await sendYardSaleConversationMessage(conversationId, newMessage.trim());
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

	const isMyMessage = (message: Message) => currentUser && message.sender_id === currentUser.id;
</script>

<div class="flex h-screen flex-col bg-gray-50 dark:bg-gray-900">
	<!-- Header -->
	<div
		class="sticky top-0 z-10 border-b border-gray-200 bg-white/80 backdrop-blur-lg dark:border-gray-700 dark:bg-gray-800/80"
	>
		<div class="mx-auto max-w-4xl px-4 py-4">
			<div class="flex items-center gap-3">
				<button
					onclick={() => goto(backUrl)}
					class="rounded-full p-2 transition hover:bg-gray-100 dark:hover:bg-gray-700"
					aria-label="Back to messages"
				>
					<FontAwesomeIcon icon={faChevronLeft} class="h-5 w-5" />
				</button>
				<div class="flex-1">
					{#if conversation?.yard_sale_id}
						<button
							onclick={() => conversation && goto(`/yard-sale/${conversation.yard_sale_id}`)}
							class="group inline-flex items-center gap-2 text-left transition hover:text-blue-600 dark:hover:text-blue-400"
						>
							<h1 class="text-lg font-semibold text-gray-900 dark:text-white">
								{conversation.yard_sale_title || 'Conversation'}
							</h1>
							<FontAwesomeIcon
								icon={faArrowRight}
								class="h-3 w-3 text-gray-400 transition group-hover:text-blue-600 dark:text-gray-500 dark:group-hover:text-blue-400"
							/>
						</button>
					{:else}
						<h1 class="text-lg font-semibold text-gray-900 dark:text-white">
							{conversation?.yard_sale_title || 'Conversation'}
						</h1>
					{/if}
				</div>
			</div>
		</div>
	</div>
	<!-- Messages -->
	<div class="flex-1 overflow-y-auto px-4 py-6" id="messages-container">
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
		<div class="mx-auto max-w-4xl px-4 py-4">
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

<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import {
		getEventConversationMessages,
		sendEventConversationMessage,
		markEventMessageRead,
		getEventConversations,
		getCurrentUser,
		getAuthenticatedImageUrl,
		type EventMessage,
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
		faCalendar,
		faMessage,
		faArrowRightFromBracket,
		faShieldAlt
	} from '@fortawesome/free-solid-svg-icons';
	import { logout } from '$lib/auth';
	import { unreadMessageCount } from '$lib/notifications';
	import AppHeader from '$lib/AppHeader.svelte';

	const conversationId = $derived($page.params.id);
	const backUrl = $derived('/messages?tab=events');

	// Check if we should render this page at all
	let shouldRender = $state(true);
	if (typeof window !== 'undefined') {
		// If we're on login page, don't render (shouldn't happen, but safety check)
		if (window.location.pathname === '/login') {
			shouldRender = false;
		}
		// Check logout flag only - don't check token
		if (
			typeof sessionStorage !== 'undefined' &&
			sessionStorage.getItem('logout_redirecting') === 'true'
		) {
			window.location.replace('/login');
			shouldRender = false;
		}
	}

	let messages = $state<EventMessage[]>([]);
	let conversation = $state<{ event_title?: string; event_id?: string } | null>(null);
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
				getEventConversationMessages(conversationId),
				getCurrentUser(),
				getEventConversations()
			]);
			messages = msgs;
			currentUser = user;

			// Find the conversation to get event title and ID
			const conv = convs.find((c) => c.id === conversationId);
			if (conv) {
				conversation = {
					event_title: conv.event_title,
					event_id: conv.event_id
				};
			}

			// Mark unread messages as read
			const unreadMessages = msgs.filter((m) => !m.is_read && m.recipient_id === user?.id);
			for (const msg of unreadMessages) {
				try {
					await markEventMessageRead(msg.id);
				} catch {
					// Ignore errors marking as read
				}
			}
		} catch (e) {
			console.error('Error loading messages:', e);
			// Don't redirect - just show error and stop loading
			error = e instanceof Error ? e.message : 'Failed to load messages';
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		// Don't run if we're on login page
		if (typeof window !== 'undefined' && window.location.pathname === '/login') {
			return;
		}

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

		// Start loading - don't check token
		isAuthenticated = true;
		loading = true;
		load();
	});

	async function sendMessage() {
		if (!conversationId || !newMessage.trim() || sending) return;

		sending = true;
		error = null;
		try {
			const sentMessage = await sendEventConversationMessage(conversationId, newMessage.trim());
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

	const isMyMessage = (message: EventMessage) =>
		currentUser && message.sender_id === currentUser.id;
</script>

{#if !shouldRender || typeof window === 'undefined' || (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('logout_redirecting') === 'true')}
	<!-- Don't render anything if on login page or logout is happening -->
{:else}
	<div class="flex h-screen flex-col bg-gray-50 dark:bg-gray-900">
		<AppHeader
			title={conversation?.event_title || 'Event Conversation'}
			subtitle="Event Messages"
			showBackButton={true}
			{backUrl}
			backLabel="Back to Messages"
			{currentUser}
		/>

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
							{#if message.sender_profile_picture && message.sender_profile_picture.trim() !== ''}
								<img
									src={getAuthenticatedImageUrl(message.sender_profile_picture)}
									alt={message.sender_username || 'Unknown'}
									class="h-10 w-10 shrink-0 rounded-full object-cover ring-1 ring-gray-200 dark:ring-gray-700"
									onerror={(e) => {
										// Fallback to initial if image fails to load
										const img = e.target as HTMLImageElement;
										img.style.display = 'none';
										const fallback = img.parentElement?.querySelector(
											'.profile-fallback'
										) as HTMLElement;
										if (fallback) fallback.style.display = 'flex';
									}}
								/>
							{/if}
							<div
								class="profile-fallback flex h-10 w-10 shrink-0 items-center justify-center rounded-full {isMyMessage(
									message
								)
									? 'bg-green-600 text-white'
									: 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300'} {message.sender_profile_picture &&
								message.sender_profile_picture.trim() !== ''
									? 'hidden'
									: ''}"
							>
								<span class="text-sm font-medium">
									{(message.sender_username || 'U').charAt(0).toUpperCase()}
								</span>
							</div>
							<div
								class="max-w-[85%] rounded-2xl px-5 py-3 shadow-sm {isMyMessage(message)
									? 'bg-green-600 text-white'
									: 'bg-white text-gray-900 ring-1 ring-gray-200 dark:bg-gray-800 dark:text-white dark:ring-gray-700'}"
							>
								<div class="flex flex-wrap items-center gap-2">
									<p class="text-sm font-semibold">
										{message.sender_username || 'Unknown'}
									</p>
									{#if message.sender_is_admin}
										<div
											class="flex items-center gap-1 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 px-1.5 py-0.5 text-[10px] font-bold text-white shadow-sm"
											title="Admin"
										>
											<FontAwesomeIcon icon={faShieldAlt} class="h-2 w-2" />
											<span class="hidden sm:inline">Admin</span>
										</div>
									{/if}
								</div>
								<p class="mt-1.5 text-[15px] leading-relaxed">{message.content}</p>
								<p
									class="mt-2 text-xs {isMyMessage(message)
										? 'text-green-100'
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
						class="flex-1 rounded-xl border-0 bg-gray-100 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-500 ring-1 ring-gray-300 transition focus:ring-2 focus:ring-green-500 focus:outline-none dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:ring-gray-600"
					/>
					<button
						type="submit"
						disabled={sending || !newMessage.trim()}
						class="rounded-xl bg-green-600 px-4 py-2.5 text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
					>
						<FontAwesomeIcon icon={faPaperPlane} class="h-4 w-4" />
					</button>
				</form>
			</div>
		</div>
	</div>
{/if}

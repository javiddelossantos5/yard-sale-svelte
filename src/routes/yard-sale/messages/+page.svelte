<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import {
		getYardSaleConversations,
		getYardSaleUnreadCount,
		getCurrentUser,
		type YardSaleConversation,
		type CurrentUser
	} from '$lib/api';
	import { FontAwesomeIcon } from '@fortawesome/svelte-fontawesome';
	import {
		faChevronLeft,
		faEnvelope,
		faMessage,
		faArrowRight
	} from '@fortawesome/free-solid-svg-icons';

	let conversations = $state<YardSaleConversation[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let unreadCount = $state(0);
	let currentUser = $state<CurrentUser | null>(null);

	async function load() {
		loading = true;
		error = null;
		try {
			const [convs, unread, user] = await Promise.all([
				getYardSaleConversations(),
				getYardSaleUnreadCount(),
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
		// Check if we're in the middle of a logout redirect - if so, don't do anything
		if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('logout_redirecting') === 'true') {
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

	function getOtherParticipant(conv: YardSaleConversation): string {
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
	<div
		class="sticky top-0 z-10 border-b border-gray-200 bg-white/80 backdrop-blur-lg dark:border-gray-700 dark:bg-gray-800/80"
	>
		<div class="mx-auto max-w-4xl px-4 py-4">
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-3">
					<button
						onclick={() => goto('/')}
						class="rounded-full p-2 transition hover:bg-gray-100 dark:hover:bg-gray-700"
						aria-label="Back to yard sales"
					>
						<FontAwesomeIcon icon={faChevronLeft} class="h-5 w-5" />
					</button>
					<h1 class="text-xl font-semibold text-gray-900 dark:text-white">Messages</h1>
					{#if unreadCount > 0}
						<span class="rounded-full bg-red-500 px-2 py-0.5 text-xs font-semibold text-white">
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
					Start a conversation by messaging a seller about a yard sale.
				</p>
			</div>
		{:else}
			<div class="space-y-2">
				{#each conversations as conv}
					<div
						onclick={(e) => {
							e.preventDefault();
							e.stopPropagation();
							console.log('Navigating to yard sale message:', `/yard-sale/messages/${conv.id}`);
							goto(`/yard-sale/messages/${conv.id}`);
						}}
						onkeydown={(e) => {
							if (e.key === 'Enter' || e.key === ' ') {
								e.preventDefault();
								goto(`/yard-sale/messages/${conv.id}`);
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
												goto(`/yard-sale/${conv.yard_sale_id}`);
											}}
											class="title-link inline-flex cursor-pointer items-center gap-2 truncate font-semibold text-gray-900 transition hover:text-blue-600 dark:text-white dark:hover:text-blue-400"
											role="button"
											tabindex="0"
											onkeydown={(e) => {
												if (e.key === 'Enter' || e.key === ' ') {
													e.preventDefault();
													e.stopPropagation();
													goto(`/yard-sale/${conv.yard_sale_id}`);
												}
											}}
										>
											<span class="truncate">{conv.yard_sale_title || 'Unknown Yard Sale'}</span>
											<FontAwesomeIcon
												icon={faArrowRight}
												class="title-link-icon h-3 w-3 shrink-0 text-gray-400 transition dark:text-gray-500"
											/>
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

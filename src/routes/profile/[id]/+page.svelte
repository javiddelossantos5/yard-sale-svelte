<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import {
		getUserProfile,
		getUserRatings,
		getCurrentUser,
		createRating,
		createReport,
		getAllUserMessages,
		markMessageAsRead,
		getConversationMessages,
		sendConversationMessage,
		type CurrentUser,
		type Rating,
		type Report,
		type Message
	} from '$lib/api';
	import { FontAwesomeIcon } from '@fortawesome/svelte-fontawesome';
	import RatingModal from '$lib/RatingModal.svelte';
	import ReportModal from '$lib/ReportModal.svelte';
	import MessageModal from '$lib/MessageModal.svelte';
	import { unreadMessageCount, loadNotificationCounts } from '$lib/notifications';

	let profileUser = $state<CurrentUser | null>(null);
	let currentUser = $state<CurrentUser | null>(null);
	let ratings = $state<Rating[]>([]);
	let messages = $state<Message[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);

	// Modal states
	let showRatingModal = $state(false);
	let showReportModal = $state(false);
	let showMessageModal = $state(false);
	let showMessagesList = $state(false);
	let showConversationModal = $state(false);

	// Conversation state
	let selectedConversationId = $state<number | null>(null);
	let selectedConversationMessages = $state<Message[]>([]);
	let conversationLoading = $state(false);
	let newMessageContent = $state('');

	let userId = $derived($page.params.id || '');
	let isOwnProfile = $derived(currentUser?.id === userId);
	let canRate = $derived(currentUser && !isOwnProfile);

	// Function to sort messages with unread ones at the top
	function getSortedMessages() {
		if (!currentUser) return messages;

		return [...messages].sort((a, b) => {
			// If both are from current user, sort by date (newest first)
			if (a.sender_id === currentUser!.id && b.sender_id === currentUser!.id) {
				return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
			}

			// If both are from others, prioritize unread
			if (a.sender_id !== currentUser!.id && b.sender_id !== currentUser!.id) {
				if (a.is_read !== b.is_read) {
					return a.is_read ? 1 : -1; // Unread first
				}
				return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
			}

			// Mixed: prioritize unread messages from others
			if (a.sender_id !== currentUser!.id && !a.is_read) return -1;
			if (b.sender_id !== currentUser!.id && !b.is_read) return 1;

			// Default: sort by date
			return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
		});
	}

	onMount(async () => {
		if (!userId || userId.trim() === '') {
			error = 'Invalid user ID';
			loading = false;
			return;
		}

		try {
			// Load data with individual error handling
			await loadCurrentUser();
			await loadProfileUser();
			await loadRatings();
		} catch (err) {
			console.error('Error during profile loading:', err);
		} finally {
			// Always set loading to false
			loading = false;
		}
	});

	async function loadCurrentUser() {
		try {
			currentUser = await getCurrentUser();
		} catch (error) {
			console.warn('Failed to load current user:', error);
			currentUser = null;
		}
	}

	async function loadProfileUser() {
		try {
			profileUser = await getUserProfile(userId);
		} catch (err) {
			console.error('Failed to load profile user:', err);
			error = err instanceof Error ? err.message : 'Failed to load profile';
		}
	}

	async function loadRatings() {
		try {
			ratings = await getUserRatings(userId);
		} catch (error) {
			console.error('Failed to load ratings:', error);
			ratings = []; // Set empty array as fallback
		}
	}

	async function loadMessages() {
		try {
			messages = await getAllUserMessages();
		} catch (error) {
			console.error('Failed to load messages:', error);
			messages = []; // Set empty array as fallback
		}
	}

	function handleRateUser() {
		const debugInfo = {
			timestamp: new Date().toISOString(),
			canRate,
			currentUserId: currentUser?.id,
			isOwnProfile,
			profileUserId: profileUser?.id,
			action: 'rate_user_clicked'
		};

		console.log('handleRateUser called:', debugInfo);
		localStorage.setItem('profile_debug', JSON.stringify(debugInfo));

		if (canRate) {
			showRatingModal = true;
			console.log('Rating modal opened');
			localStorage.setItem(
				'profile_debug',
				JSON.stringify({
					...debugInfo,
					action: 'modal_opened'
				})
			);
		} else {
			console.log('Cannot rate user:', { canRate, currentUser, isOwnProfile });
			localStorage.setItem(
				'profile_debug',
				JSON.stringify({
					...debugInfo,
					action: 'cannot_rate_user'
				})
			);
		}
	}

	function handleReportUser() {
		if (currentUser && !isOwnProfile) {
			showReportModal = true;
		}
	}

	function handleMessageUser() {
		console.log('handleMessageUser called');
		console.log('currentUser:', currentUser);
		console.log('isOwnProfile:', isOwnProfile);
		console.log('profileUser:', profileUser);

		if (currentUser && !isOwnProfile) {
			console.log('Opening message modal');
			showMessageModal = true;
		} else {
			console.log('Cannot open message modal - conditions not met');
		}
	}

	function handleCloseMessageModal() {
		showMessageModal = false;
	}

	function handleViewMessages() {
		showMessagesList = true;
		loadMessages(); // Load messages when opening the list
		loadNotificationCounts(); // Load notification counts to sync unread counts
	}

	function handleCloseMessagesList() {
		showMessagesList = false;
	}

	async function handleMessageClick(message: Message) {
		if (!currentUser) return;

		// Mark message as read if it's not already read and it's not from the current user
		if (!message.is_read && message.sender_id !== currentUser.id) {
			try {
				await markMessageAsRead(message.id);
				// Update the message in the local state
				messages = messages.map((m) => (m.id === message.id ? { ...m, is_read: true } : m));
				// Refresh notification counts to sync the unread count
				loadNotificationCounts();
			} catch (error) {
				console.error('Failed to mark message as read:', error);
			}
		}

		// If the message has a conversation_id, load the conversation
		if (message.conversation_id) {
			selectedConversationId = message.conversation_id;
			conversationLoading = true;
			showConversationModal = true;

			try {
				const conversationMessages = await getConversationMessages(message.conversation_id);
				// Sort conversation messages chronologically (oldest to newest for chat experience)
				selectedConversationMessages = conversationMessages.sort(
					(a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
				);
			} catch (error) {
				console.error('Failed to load conversation messages:', error);
				selectedConversationMessages = [];
			} finally {
				conversationLoading = false;
			}
		} else {
			// If no conversation_id, show a simple alert or could open a new conversation modal
			console.log('Message has no conversation_id, cannot open conversation');
		}
	}

	function handleCloseConversationModal() {
		showConversationModal = false;
		selectedConversationId = null;
		selectedConversationMessages = [];
	}

	async function handleSendConversationMessage(content: string) {
		if (!selectedConversationId || !currentUser || !content.trim()) return;

		try {
			await sendConversationMessage(selectedConversationId, content);
			// Clear the input
			newMessageContent = '';
			// Reload conversation messages (sorted with newest at bottom)
			const conversationMessages = await getConversationMessages(selectedConversationId);
			selectedConversationMessages = conversationMessages.sort(
				(a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
			);
			// Reload all messages to update the main list
			await loadMessages();
		} catch (error) {
			console.error('Failed to send conversation message:', error);
		}
	}

	async function handleRatingSuccess() {
		const debugInfo = {
			timestamp: new Date().toISOString(),
			action: 'rating_success_callback',
			profileUserId: profileUser?.id
		};

		console.log('Rating submitted successfully, refreshing data...');
		localStorage.setItem('profile_debug', JSON.stringify(debugInfo));

		try {
			await Promise.all([loadRatings(), loadProfileUser()]);
			console.log('Data refreshed successfully');
			localStorage.setItem(
				'profile_debug',
				JSON.stringify({
					...debugInfo,
					action: 'data_refresh_success'
				})
			);
		} catch (error) {
			console.error('Error refreshing data after rating:', error);
			localStorage.setItem(
				'profile_debug',
				JSON.stringify({
					...debugInfo,
					action: 'data_refresh_error',
					error: error instanceof Error ? error.message : 'Unknown error'
				})
			);
		}
		showRatingModal = false;
	}

	async function handleReportSuccess() {
		showReportModal = false;
	}

	function formatDate(dateString: string): string {
		return new Date(dateString).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		});
	}
</script>

<svelte:head>
	<title>{profileUser ? `${profileUser.full_name} - Profile` : 'User Profile'}</title>
	<meta name="description" content={profileUser?.bio || 'View user profile'} />
</svelte:head>

<div class="min-h-screen bg-gray-50 dark:bg-gray-900">
	<!-- Header -->
	<header class="bg-white shadow-sm dark:bg-gray-800">
		<div class="mx-auto max-w-4xl px-4 py-4 sm:px-6 lg:px-8">
			<div class="flex items-center justify-between">
				<button
					onclick={() => goto('/')}
					class="inline-flex items-center rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
				>
					<FontAwesomeIcon icon="arrow-left" class="h-5 w-5" />
				</button>
				<h1 class="text-lg font-semibold text-gray-900 dark:text-white">Profile</h1>
				<div class="w-9"></div>
			</div>
		</div>
	</header>

	<div class="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
		{#if loading}
			<div class="flex items-center justify-center py-12">
				<FontAwesomeIcon icon="spinner" class="h-8 w-8 animate-spin text-blue-600" />
				<span class="ml-3 text-gray-600 dark:text-gray-300">Loading profile...</span>
			</div>
		{:else if error}
			<div class="rounded-2xl bg-red-50 p-6 dark:bg-red-900/20">
				<div class="flex">
					<FontAwesomeIcon icon="exclamation-triangle" class="h-5 w-5 text-red-400" />
					<div class="ml-3">
						<h3 class="text-sm font-medium text-red-800 dark:text-red-200">Error</h3>
						<div class="mt-2 text-sm text-red-700 dark:text-red-300">{error}</div>
					</div>
				</div>
			</div>
		{:else if profileUser}
			<div class="space-y-6">
				<!-- Profile Header -->
				<div
					class="rounded-2xl bg-white p-6 shadow-sm dark:bg-gray-800 dark:shadow-none dark:ring-1 dark:ring-gray-700"
				>
					<div class="flex flex-col items-center text-center sm:flex-row sm:text-left">
						<!-- Avatar -->
						<div class="mb-4 sm:mr-6 sm:mb-0">
							<div
								class="flex h-20 w-20 items-center justify-center rounded-full bg-linear-to-br from-blue-500 to-purple-600 text-2xl font-bold text-white"
							>
								{profileUser.full_name?.charAt(0).toUpperCase() || '?'}
							</div>
						</div>

						<!-- Profile Info -->
						<div class="flex-1">
							<div class="flex flex-col items-center sm:items-start">
								<h1 class="text-2xl font-bold text-gray-900 dark:text-white">
									{profileUser.full_name || 'Unknown User'}
								</h1>
								<p class="text-gray-600 dark:text-gray-300">@{profileUser.username || 'unknown'}</p>

								<!-- Trust Metrics -->
								<div class="mt-3 flex flex-wrap items-center gap-4">
									{#if profileUser.average_rating !== undefined}
										<div class="flex items-center">
											<div class="flex items-center">
												{#each Array(5) as _, i}
													<FontAwesomeIcon
														icon={i < Math.floor(profileUser.average_rating || 0) ? 'star' : 'star'}
														class="h-4 w-4 {i < Math.floor(profileUser.average_rating || 0)
															? 'text-yellow-400'
															: 'text-gray-300 dark:text-gray-600'}"
													/>
												{/each}
											</div>
											<span class="ml-2 text-sm font-medium text-gray-900 dark:text-white">
												{profileUser.average_rating?.toFixed(1)} ({profileUser.total_ratings || 0} reviews)
											</span>
										</div>
									{/if}
								</div>

								<!-- Location -->
								{#if profileUser.location && profileUser.location.city}
									<div class="mt-2 flex items-center text-sm text-gray-600 dark:text-gray-300">
										<FontAwesomeIcon icon="map-marker-alt" class="mr-1 h-4 w-4" />
										{profileUser.location.city}, {profileUser.location.state}
									</div>
								{/if}
							</div>
						</div>

						<!-- Action Buttons -->
						<div class="mt-4 flex flex-col gap-2 sm:mt-0">
							{#if isOwnProfile}
								<button
									onclick={handleViewMessages}
									class="inline-flex items-center justify-center rounded-full bg-purple-600 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-purple-700 active:scale-95"
								>
									<FontAwesomeIcon icon="comments" class="mr-2 h-4 w-4" />
									View Messages
								</button>
							{/if}

							{#if currentUser && !isOwnProfile}
								<button
									onclick={handleMessageUser}
									class="inline-flex items-center justify-center rounded-full bg-green-600 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-green-700 active:scale-95"
								>
									<FontAwesomeIcon icon="envelope" class="mr-2 h-4 w-4" />
									Message User
								</button>
							{/if}

							{#if canRate}
								<button
									onclick={handleRateUser}
									class="inline-flex items-center justify-center rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-blue-700 active:scale-95"
								>
									<FontAwesomeIcon icon="star" class="mr-2 h-4 w-4" />
									Rate User
								</button>
							{/if}

							{#if currentUser && !isOwnProfile}
								<button
									onclick={handleReportUser}
									class="inline-flex items-center justify-center rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-all hover:bg-gray-50 active:scale-95 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
								>
									<FontAwesomeIcon icon="flag" class="mr-2 h-4 w-4" />
									Report
								</button>
							{/if}
						</div>
					</div>

					<!-- Bio -->
					{#if profileUser.bio}
						<div class="mt-6 border-t border-gray-200 pt-6 dark:border-gray-700">
							<p class="text-gray-700 dark:text-gray-300">{profileUser.bio}</p>
						</div>
					{/if}
				</div>

				<!-- Reviews -->
				{#if ratings.length > 0}
					<div
						class="rounded-2xl bg-white p-6 shadow-sm dark:bg-gray-800 dark:shadow-none dark:ring-1 dark:ring-gray-700"
					>
						<h2 class="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Reviews</h2>
						<div class="space-y-4">
							{#each ratings as rating}
								<div
									class="border-b border-gray-200 pb-4 last:border-b-0 last:pb-0 dark:border-gray-700"
								>
									<div class="flex items-start justify-between">
										<div class="flex-1">
											<div class="flex items-center gap-2">
												<div class="flex items-center">
													{#each Array(5) as _, i}
														<FontAwesomeIcon
															icon="star"
															class="h-4 w-4 {i < rating.rating
																? 'text-yellow-400'
																: 'text-gray-300 dark:text-gray-600'}"
														/>
													{/each}
												</div>
												<span class="text-sm font-medium text-gray-900 dark:text-white">
													{rating.reviewer_username || 'Anonymous'}
												</span>
												<span class="text-xs text-gray-500 dark:text-gray-400">
													{formatDate(rating.created_at)}
												</span>
											</div>
											{#if rating.review_text}
												<p class="mt-2 text-sm text-gray-700 dark:text-gray-300">
													{rating.review_text}
												</p>
											{/if}
											{#if rating.yard_sale_title}
												<p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
													For: {rating.yard_sale_title}
												</p>
											{/if}
										</div>
									</div>
								</div>
							{/each}
						</div>
					</div>
				{/if}
			</div>
		{/if}
	</div>
</div>

<!-- Modals -->
{#if showRatingModal && profileUser}
	<RatingModal
		isOpen={showRatingModal}
		ratedUserId={profileUser.id}
		ratedUserName={profileUser.full_name || 'Unknown User'}
		onClose={() => (showRatingModal = false)}
		onSuccess={handleRatingSuccess}
	/>
{/if}

{#if showReportModal && profileUser}
	<ReportModal
		isOpen={showReportModal}
		reportedUserId={profileUser.id}
		reportedUserName={profileUser.full_name || 'Unknown User'}
		onClose={() => (showReportModal = false)}
		onSuccess={handleReportSuccess}
	/>
{/if}

{#if showMessageModal && profileUser && currentUser}
	<MessageModal
		isOpen={showMessageModal}
		yardSaleId=""
		yardSaleTitle="Profile Message"
		otherUserId={profileUser.id}
		otherUsername={profileUser.full_name || profileUser.username || 'Unknown User'}
		currentUserId={currentUser.id}
		onClose={handleCloseMessageModal}
	/>
{/if}

<!-- Messages List Modal -->
{#if showMessagesList}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
		<div class="mx-4 w-full max-w-2xl rounded-2xl bg-white shadow-2xl dark:bg-gray-800">
			<!-- Header -->
			<div
				class="flex items-center justify-between border-b border-gray-200 p-6 dark:border-gray-700"
			>
				<div class="flex items-center gap-3">
					<FontAwesomeIcon icon="comments" class="h-6 w-6 text-purple-600" />
					<div class="flex items-center gap-2">
						<h2 class="text-xl font-semibold text-gray-900 dark:text-white">Your Messages</h2>
						{#if $unreadMessageCount > 0}
							<span class="rounded-full bg-red-500 px-2 py-1 text-xs font-medium text-white">
								{$unreadMessageCount} unread
							</span>
						{/if}
					</div>
				</div>
				<button
					onclick={handleCloseMessagesList}
					class="rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
					aria-label="Close messages"
				>
					<FontAwesomeIcon icon="times" class="h-5 w-5" />
				</button>
			</div>

			<!-- Messages List -->
			<div class="max-h-96 overflow-y-auto p-6">
				{#if messages.length === 0}
					<div class="flex flex-col items-center justify-center py-12 text-center">
						<FontAwesomeIcon icon="comments" class="mb-4 h-12 w-12 text-gray-300" />
						<h3 class="mb-2 text-lg font-medium text-gray-900 dark:text-white">No messages yet</h3>
						<p class="text-gray-500 dark:text-gray-400">Start a conversation with someone!</p>
					</div>
				{:else}
					<div class="space-y-4">
						{#each getSortedMessages() as message (message.id)}
							<button
								onclick={() => handleMessageClick(message)}
								class="w-full rounded-xl border p-4 text-left transition-all hover:shadow-md active:scale-98 {message.sender_id !==
									currentUser?.id && !message.is_read
									? 'border-blue-300 bg-blue-50 hover:bg-blue-100 dark:border-blue-600 dark:bg-blue-900/20 dark:hover:bg-blue-900/30'
									: 'border-gray-200 bg-gray-50 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600'}"
							>
								<div class="flex items-start justify-between">
									<div class="flex-1">
										<div class="mb-2 flex items-center gap-2">
											<span class="text-sm font-medium text-gray-900 dark:text-white">
												{message.sender_username}
											</span>
											<span class="text-xs text-gray-500 dark:text-gray-400">
												{new Date(message.created_at).toLocaleDateString()}
											</span>
											{#if !message.is_read}
												<span class="rounded-full bg-blue-500 px-2 py-1 text-xs text-white"
													>New</span
												>
											{/if}
										</div>
										<p class="text-gray-700 dark:text-gray-300">{message.content}</p>
										{#if message.conversation_id}
											<div
												class="mt-2 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400"
											>
												<FontAwesomeIcon icon="comments" class="h-3 w-3" />
												<span>Click to view conversation</span>
											</div>
										{/if}
									</div>
									<div class="ml-4 flex flex-col items-end gap-2">
										{#if message.sender_id === currentUser?.id}
											<span
												class="rounded-full bg-green-100 px-2 py-1 text-xs text-green-800 dark:bg-green-900 dark:text-green-200"
											>
												Sent
											</span>
										{:else}
											<span
												class="rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-800 dark:bg-blue-900 dark:text-blue-200"
											>
												Received
											</span>
										{/if}
										{#if message.conversation_id}
											<FontAwesomeIcon icon="arrow-right" class="h-4 w-4 text-gray-400" />
										{/if}
									</div>
								</div>
							</button>
						{/each}
					</div>
				{/if}
			</div>

			<!-- Footer -->
			<div class="border-t border-gray-200 p-6 dark:border-gray-700">
				<div class="flex items-center justify-between">
					<span class="text-sm text-gray-500 dark:text-gray-400">
						{messages.length} message{messages.length !== 1 ? 's' : ''} total
					</span>
					<button
						onclick={handleCloseMessagesList}
						class="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
					>
						Close
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}

<!-- Conversation Modal -->
{#if showConversationModal && selectedConversationId}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
		<div class="mx-4 w-full max-w-2xl rounded-2xl bg-white shadow-2xl dark:bg-gray-800">
			<!-- Header -->
			<div
				class="flex items-center justify-between border-b border-gray-200 p-6 dark:border-gray-700"
			>
				<div class="flex items-center gap-3">
					<FontAwesomeIcon icon="comments" class="h-6 w-6 text-blue-600" />
					<h2 class="text-xl font-semibold text-gray-900 dark:text-white">Conversation</h2>
				</div>
				<button
					onclick={handleCloseConversationModal}
					class="rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
					aria-label="Close conversation"
				>
					<FontAwesomeIcon icon="times" class="h-5 w-5" />
				</button>
			</div>

			<!-- Messages -->
			<div class="max-h-96 overflow-y-auto p-6">
				{#if conversationLoading}
					<div class="flex items-center justify-center py-8">
						<div
							class="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"
						></div>
						<span class="ml-3 text-gray-600 dark:text-gray-400">Loading conversation...</span>
					</div>
				{:else if selectedConversationMessages.length === 0}
					<div class="flex flex-col items-center justify-center py-12 text-center">
						<FontAwesomeIcon icon="comments" class="mb-4 h-12 w-12 text-gray-300" />
						<h3 class="mb-2 text-lg font-medium text-gray-900 dark:text-white">
							No messages in conversation
						</h3>
						<p class="text-gray-500 dark:text-gray-400">Start the conversation below!</p>
					</div>
				{:else}
					<div class="space-y-4">
						{#each selectedConversationMessages as message (message.id)}
							<div
								class="flex {message.sender_id === currentUser?.id
									? 'justify-end'
									: 'justify-start'}"
							>
								<div
									class="max-w-xs rounded-2xl px-4 py-2 {message.sender_id === currentUser?.id
										? 'bg-blue-500 text-white'
										: 'bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-white'}"
								>
									<p class="text-sm">{message.content}</p>
									<p class="mt-1 text-xs opacity-70">
										{new Date(message.created_at).toLocaleTimeString()}
									</p>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</div>

			<!-- Message Input -->
			<div class="border-t border-gray-200 p-6 dark:border-gray-700">
				<div class="flex gap-3">
					<input
						type="text"
						placeholder="Type your message..."
						class="flex-1 rounded-xl border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-blue-400"
						bind:value={newMessageContent}
						onkeydown={(e) => e.key === 'Enter' && handleSendConversationMessage(newMessageContent)}
					/>
					<button
						onclick={() => handleSendConversationMessage(newMessageContent)}
						disabled={!newMessageContent.trim()}
						class="rounded-xl bg-blue-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:bg-gray-300 dark:disabled:bg-gray-600"
					>
						<FontAwesomeIcon icon="paper-plane" class="h-4 w-4" />
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}

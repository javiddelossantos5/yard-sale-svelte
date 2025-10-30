<script lang="ts">
	import { onMount } from 'svelte';
	import {
		getYardSaleMessages,
		sendMessage,
		markMessageAsRead,
		getConversationMessages,
		sendConversationMessage,
		sendMessageToUser,
		getOrCreateConversation,
		type Message
	} from './api';
	import { addMessageNotification } from './notifications';

	let {
		isOpen,
		yardSaleId,
		yardSaleTitle,
		otherUserId,
		otherUsername,
		currentUserId,
		onClose,
		fullPage = false
	} = $props<{
			isOpen: boolean;
			yardSaleId: number;
			yardSaleTitle: string;
			otherUserId: number;
			otherUsername: string;
			currentUserId: number;
			onClose: () => void;
		fullPage?: boolean;
		}>();

	let messages = $state<Message[]>([]);
	let newMessage = $state('');
	let loading = $state(true);
	let sending = $state(false);
	let error = $state<string | null>(null);
	let messagesContainer = $state<HTMLDivElement>();
	let conversationId = $state<number | null>(null);

	// Determine if current user is the yard sale owner
	let isOwner = $derived(currentUserId === otherUserId);

	// Allow anyone to message anyone - no restrictions
	let canOwnerReply = $derived(true);

	// Get the username of the person you're currently chatting with
	let currentChatPartner = $derived(() => {
		if (!isOwner) {
			// If you're not the owner, you're chatting with the owner
			return otherUsername;
		} else {
			// If you're the owner, find the most recent customer you're replying to
			const lastMessageFromCustomer = messages
				.filter((msg) => msg.sender_id !== currentUserId)
				.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

			return lastMessageFromCustomer ? lastMessageFromCustomer.sender_username : 'No one yet';
		}
	});

	$effect(() => {
		if (isOpen && otherUserId) {
			loadMessages();
		}
	});

	async function loadMessages() {
		loading = true;
		error = null;
		try {
			// Handle profile messaging (yardSaleId = "")
			if (yardSaleId === '' || yardSaleId === '0') {
				// Get or create conversation between current user and other user
				const conversation = await getOrCreateConversation(otherUserId);
				conversationId = conversation.id;

				// Load conversation messages only if conversation exists
				if (conversationId) {
					messages = await getConversationMessages(conversationId);
				} else {
					// No existing conversation, start with empty messages
					messages = [];
				}
			} else {
				// Handle yard sale messaging
			messages = await getYardSaleMessages(yardSaleId);
			// Mark unread messages as read
			const unreadMessages = messages.filter(
				(msg) => !msg.is_read && msg.sender_id !== currentUserId
			);
			for (const message of unreadMessages) {
				await markMessageAsRead(message.id);
			}
			}

			// Scroll to bottom
			setTimeout(() => {
				if (messagesContainer) {
					messagesContainer.scrollTop = messagesContainer.scrollHeight;
				}
			}, 100);
		} catch (err) {
			console.error('Error loading messages:', err);
			error = err instanceof Error ? err.message : 'Failed to load messages';
		} finally {
			loading = false;
		}
	}

	async function handleSendMessage() {
		if (!newMessage.trim() || sending) return;

		// Handle profile messaging (yardSaleId = "") - will be handled in the try block

		sending = true;
		try {
			let message: Message;

			// Handle profile messaging (yardSaleId = "")
			if (yardSaleId === '' || yardSaleId === '0') {
				if (conversationId) {
					// Send message in existing conversation
					message = await sendConversationMessage(conversationId, newMessage.trim());
				} else {
					// Start new conversation by sending message to user
					message = await sendMessageToUser(otherUserId, newMessage.trim());
					// After sending, reload messages to get the new conversation
					await loadMessages();
				}
			} else {
				// Handle yard sale messaging
			let recipientId: number;

			if (isOwner) {
					// If the current user is the owner, they can reply to customers
				// Try to find the most recent message from someone other than the owner to reply to
				const lastMessageFromCustomer = messages
					.filter((msg) => msg.sender_id !== currentUserId)
					.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

				if (lastMessageFromCustomer) {
					// Reply to the most recent customer
					recipientId = lastMessageFromCustomer.sender_id;
				} else {
						// If no messages from customers yet, owner cannot send a message
						// They need to wait for a customer to message them first
						error =
							'No customers have messaged you yet. You can reply once someone sends you a message.';
						return;
				}
			} else {
				// If the current user is not the owner, they message the owner
				recipientId = otherUserId;
			}

				message = await sendMessage(yardSaleId, recipientId, newMessage.trim());
			}

			messages = [...messages, message];
			newMessage = '';
			// Scroll to bottom
			setTimeout(() => {
				if (messagesContainer) {
					messagesContainer.scrollTop = messagesContainer.scrollHeight;
				}
			}, 100);
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to send message';
		} finally {
			sending = false;
		}
	}

	function handleKeyPress(event: KeyboardEvent) {
		if (event.key === 'Enter' && !event.shiftKey) {
			event.preventDefault();
			handleSendMessage();
		}
	}

	function closeModal() {
		onClose();
	}

	function formatMessageTime(dateString: string): string {
		const date = new Date(dateString);
		const now = new Date().toLocaleString('en-US', { timeZone: 'America/Denver' });
		const nowDate = new Date(now);
		const diffInHours = (nowDate.getTime() - date.getTime()) / (1000 * 60 * 60);

		if (diffInHours < 24) {
			return date.toLocaleTimeString('en-US', {
				hour: 'numeric',
				minute: '2-digit',
				hour12: true,
				timeZone: 'America/Denver'
			});
		} else {
			return date.toLocaleDateString('en-US', {
				month: 'short',
				day: 'numeric',
				hour: 'numeric',
				minute: '2-digit',
				hour12: true,
				timeZone: 'America/Denver'
			});
		}
	}

	// Check for new messages and trigger notifications
	async function checkForNewMessages() {
		if (!isOpen || !otherUserId || !currentUserId) return;

		try {
			let newMessages: Message[] = [];

			if (yardSaleId === '' || yardSaleId === '0') {
				// Check for new conversation messages
				if (conversationId) {
					newMessages = await getConversationMessages(conversationId);
				}
			} else {
				// Check for new yard sale messages
				newMessages = await getYardSaleMessages(yardSaleId);
			}

			// Find new unread messages from the other user
			const unreadFromOther = newMessages.filter(
				(msg) => !msg.is_read && msg.sender_id !== currentUserId
			);

			// Trigger notifications for new messages
			for (const message of unreadFromOther) {
				const senderUsername = message.sender_username || 'Unknown User';
				addMessageNotification(
					message.sender_id,
					senderUsername,
					message.content,
					message.conversation_id || undefined,
					message.yard_sale_id || undefined
				);
			}
		} catch (error) {
			console.warn('Error checking for new messages:', error);
		}
	}

	// Set up periodic message checking when modal is open
	let messageCheckInterval: number | null = null;

	$effect(() => {
		if (isOpen) {
			// Check for new messages every 10 seconds
			messageCheckInterval = setInterval(checkForNewMessages, 10000);
		} else {
			// Clear interval when modal is closed
			if (messageCheckInterval) {
				clearInterval(messageCheckInterval);
				messageCheckInterval = null;
			}
		}

		// Cleanup on component destroy
		return () => {
			if (messageCheckInterval) {
				clearInterval(messageCheckInterval);
			}
		};
	});
</script>

{#if isOpen}
	<!-- Modal Backdrop -->
	<div
		class="fixed inset-0 z-50 overflow-y-auto"
		aria-labelledby="modal-title"
		role="dialog"
		aria-modal="true"
	>
		{#if fullPage}
			<!-- Full Page Modal -->
			<div class="flex min-h-screen">
				<!-- Background overlay -->
				<div
					class="bg-opacity-30 fixed inset-0 bg-gray-500 transition-opacity"
					onclick={(e) => {
						// Only close if clicking directly on the backdrop, not on child elements
						if (e.target === e.currentTarget) {
							closeModal();
						}
					}}
					aria-hidden="true"
				></div>

				<!-- Full Page Modal panel -->
				<div
					class="relative w-full transform overflow-hidden bg-white text-left shadow-xl transition-all dark:bg-gray-800"
					onclick={(e) => e.stopPropagation()}
					onkeydown={(e) => e.stopPropagation()}
					role="dialog"
					tabindex="-1"
				>
					<!-- Header -->
					<div
						class="border-b border-gray-200 bg-white px-6 py-4 dark:border-gray-600 dark:bg-gray-800"
					>
						<div class="flex items-center justify-between">
							<div>
								<h3 class="text-lg font-medium text-gray-900 dark:text-white" id="modal-title">
									{isOwner ? 'Chat with' : 'Message'}
									{currentChatPartner()}
								</h3>
								<p class="text-sm text-gray-500 dark:text-gray-400">About: {yardSaleTitle}</p>
							</div>
							<button
								type="button"
								class="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none dark:bg-gray-800 dark:hover:text-gray-300"
								onclick={closeModal}
							>
								<span class="sr-only">Close</span>
								<svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M6 18L18 6M6 6l12 12"
									/>
								</svg>
							</button>
						</div>
					</div>

					<!-- Messages Container -->
					<div class="flex h-[calc(100vh-200px)] flex-col dark:bg-gray-800">
						{#if loading}
							<div class="flex flex-1 items-center justify-center">
								<div class="flex items-center space-x-2">
									<div
										class="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"
									></div>
									<span class="text-sm text-gray-600 dark:text-gray-400">Loading messages...</span>
								</div>
							</div>
						{:else if error}
							<div class="flex flex-1 items-center justify-center">
								<div class="text-center">
									<svg
										class="mx-auto h-12 w-12 text-red-400"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
										></path>
									</svg>
									<h3 class="mt-2 text-sm font-medium text-gray-900 dark:text-white">
										Error loading messages
									</h3>
									<p class="mt-1 text-sm text-gray-500 dark:text-gray-400">{error}</p>
									<button
										onclick={loadMessages}
										class="mt-3 inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
									>
										Try Again
									</button>
								</div>
							</div>
						{:else}
							<!-- Chat Partner Info -->
							{#if messages.length > 0}
								<div
									class="border-b border-gray-200 bg-gray-50 px-4 py-2 dark:border-gray-600 dark:bg-gray-700"
								>
									<div class="flex items-center space-x-2">
										<div
											class="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900"
										>
											<span class="text-xs font-medium text-blue-600 dark:text-blue-300">
												{currentChatPartner().charAt(0).toUpperCase()}
											</span>
										</div>
										<span class="text-sm font-medium text-gray-700 dark:text-gray-300">
											Chatting with {currentChatPartner()}
										</span>
									</div>
								</div>
							{/if}

							<!-- Messages List -->
							<div bind:this={messagesContainer} class="flex-1 space-y-4 overflow-y-auto p-4">
								{#if messages.length === 0}
									<div class="flex h-full items-center justify-center">
										<div class="text-center">
											<svg
												class="mx-auto h-12 w-12 text-gray-400"
												fill="none"
												stroke="currentColor"
												viewBox="0 0 24 24"
											>
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													stroke-width="2"
													d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
												></path>
											</svg>
											<h3 class="mt-2 text-sm font-medium text-gray-900 dark:text-white">
												No messages yet
											</h3>
											<p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
												Start a conversation about this yard sale!
											</p>
										</div>
									</div>
								{:else}
									{#each messages as message (message.id)}
										<div
											class="flex {message.sender_id === currentUserId
												? 'justify-end'
												: 'justify-start'}"
										>
											<div class="max-w-xs lg:max-w-md">
												<div
													class="flex items-end space-x-2 {message.sender_id === currentUserId
														? 'flex-row-reverse space-x-reverse'
														: ''}"
												>
													<!-- Avatar -->
													<div
														class="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200"
													>
														<span class="text-xs font-medium text-gray-600">
															{message.sender_username.charAt(0).toUpperCase()}
														</span>
													</div>

													<!-- Message Bubble -->
													<div
														class="rounded-lg px-4 py-2 {message.sender_id === currentUserId
															? 'bg-blue-600 text-white'
															: 'bg-gray-100 text-gray-900'}"
													>
														<p class="text-sm">{message.content}</p>
														<p
															class="mt-1 text-xs {message.sender_id === currentUserId
																? 'text-blue-100'
																: 'text-gray-500'}"
														>
															{formatMessageTime(message.created_at)}
														</p>
													</div>
												</div>
											</div>
										</div>
									{/each}
								{/if}
							</div>

							<!-- Message Input -->
							<div class="border-t border-gray-200 p-4 dark:border-gray-600 dark:bg-gray-800">
								<div class="flex space-x-2">
									<textarea
										bind:value={newMessage}
										onkeydown={handleKeyPress}
										placeholder={isOwner ? 'Type your message...' : 'Type your message...'}
										rows="2"
										class="flex-1 resize-none rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-blue-400 dark:focus:ring-blue-400"
										disabled={sending}
									></textarea>
									<button
										onclick={handleSendMessage}
										disabled={sending || !newMessage.trim()}
										class="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
										title="Send message"
									>
										{#if sending}
											<svg class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
												<circle
													class="opacity-25"
													cx="12"
													cy="12"
													r="10"
													stroke="currentColor"
													stroke-width="4"
												></circle>
												<path
													class="opacity-75"
													fill="currentColor"
													d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
												></path>
											</svg>
										{:else}
											<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													stroke-width="2"
													d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
												></path>
											</svg>
										{/if}
									</button>
								</div>
							</div>
						{/if}
					</div>
				</div>
			</div>
		{:else}
			<!-- Regular Modal -->
		<div
			class="flex min-h-screen items-end justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0"
		>
			<!-- Background overlay -->
			<div
					class="bg-opacity-30 fixed inset-0 bg-gray-500 transition-opacity"
				onclick={(e) => {
					// Only close if clicking directly on the backdrop, not on child elements
					if (e.target === e.currentTarget) {
						closeModal();
					}
				}}
				aria-hidden="true"
			></div>

			<!-- Modal panel -->
			<div
					class="relative inline-block w-full max-w-2xl transform overflow-hidden rounded-lg bg-white text-left align-bottom shadow-xl transition-all sm:my-8 sm:align-middle dark:bg-gray-800"
				onclick={(e) => e.stopPropagation()}
				onkeydown={(e) => e.stopPropagation()}
				role="dialog"
				tabindex="-1"
			>
				<!-- Header -->
				<div
					class="border-b border-gray-200 bg-white px-6 py-4 dark:border-gray-600 dark:bg-gray-800"
				>
					<div class="flex items-center justify-between">
						<div>
							<h3 class="text-lg font-medium text-gray-900 dark:text-white" id="modal-title">
								{isOwner ? 'Chat with' : 'Message'}
								{currentChatPartner()}
							</h3>
							<p class="text-sm text-gray-500 dark:text-gray-400">About: {yardSaleTitle}</p>
						</div>
						<button
							type="button"
							class="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none dark:bg-gray-800 dark:hover:text-gray-300"
							onclick={closeModal}
						>
							<span class="sr-only">Close</span>
							<svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M6 18L18 6M6 6l12 12"
								/>
							</svg>
						</button>
					</div>
				</div>

				<!-- Messages Container -->
					<div class="flex h-[32rem] flex-col dark:bg-gray-800">
					{#if loading}
						<div class="flex flex-1 items-center justify-center">
							<div class="flex items-center space-x-2">
								<div
									class="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"
								></div>
								<span class="text-sm text-gray-600 dark:text-gray-400">Loading messages...</span>
							</div>
						</div>
					{:else if error}
						<div class="flex flex-1 items-center justify-center">
							<div class="text-center">
								<svg
									class="mx-auto h-12 w-12 text-red-400"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
									></path>
								</svg>
								<h3 class="mt-2 text-sm font-medium text-gray-900 dark:text-white">
									Error loading messages
								</h3>
								<p class="mt-1 text-sm text-gray-500 dark:text-gray-400">{error}</p>
								<button
									onclick={loadMessages}
									class="mt-3 inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
								>
									Try Again
								</button>
							</div>
						</div>
					{:else}
						<!-- Chat Partner Info -->
						{#if messages.length > 0}
							<div
								class="border-b border-gray-200 bg-gray-50 px-4 py-2 dark:border-gray-600 dark:bg-gray-700"
							>
								<div class="flex items-center space-x-2">
									<div
										class="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900"
									>
										<span class="text-xs font-medium text-blue-600 dark:text-blue-300">
											{currentChatPartner().charAt(0).toUpperCase()}
										</span>
									</div>
									<span class="text-sm font-medium text-gray-700 dark:text-gray-300">
										Chatting with {currentChatPartner()}
									</span>
								</div>
							</div>
						{/if}

						<!-- Messages List -->
						<div bind:this={messagesContainer} class="flex-1 space-y-4 overflow-y-auto p-4">
							{#if messages.length === 0}
								<div class="flex h-full items-center justify-center">
									<div class="text-center">
										<svg
											class="mx-auto h-12 w-12 text-gray-400"
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
											></path>
										</svg>
										<h3 class="mt-2 text-sm font-medium text-gray-900 dark:text-white">
											No messages yet
										</h3>
										<p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
											Start a conversation about this yard sale!
										</p>
									</div>
								</div>
							{:else}
								{#each messages as message (message.id)}
									<div
										class="flex {message.sender_id === currentUserId
											? 'justify-end'
											: 'justify-start'}"
									>
										<div class="max-w-xs lg:max-w-md">
											<div
												class="flex items-end space-x-2 {message.sender_id === currentUserId
													? 'flex-row-reverse space-x-reverse'
													: ''}"
											>
												<!-- Avatar -->
												<div
													class="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200"
												>
													<span class="text-xs font-medium text-gray-600">
														{message.sender_username.charAt(0).toUpperCase()}
													</span>
												</div>

												<!-- Message Bubble -->
												<div
													class="rounded-lg px-4 py-2 {message.sender_id === currentUserId
														? 'bg-blue-600 text-white'
														: 'bg-gray-100 text-gray-900'}"
												>
													<p class="text-sm">{message.content}</p>
													<p
														class="mt-1 text-xs {message.sender_id === currentUserId
															? 'text-blue-100'
															: 'text-gray-500'}"
													>
														{formatMessageTime(message.created_at)}
													</p>
												</div>
											</div>
										</div>
									</div>
								{/each}
							{/if}
						</div>

						<!-- Message Input -->
						<div class="border-t border-gray-200 p-4 dark:border-gray-600 dark:bg-gray-800">
							<div class="flex space-x-2">
								<textarea
									bind:value={newMessage}
									onkeydown={handleKeyPress}
									placeholder={isOwner ? 'Type your message...' : 'Type your message...'}
									rows="2"
									class="flex-1 resize-none rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-blue-400 dark:focus:ring-blue-400"
									disabled={sending}
								></textarea>
								<button
									onclick={handleSendMessage}
									disabled={sending || !newMessage.trim()}
									class="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
									title="Send message"
								>
									{#if sending}
										<svg class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
											<circle
												class="opacity-25"
												cx="12"
												cy="12"
												r="10"
												stroke="currentColor"
												stroke-width="4"
											></circle>
											<path
												class="opacity-75"
												fill="currentColor"
												d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
											></path>
										</svg>
									{:else}
										<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
											></path>
										</svg>
									{/if}
								</button>
							</div>
						</div>
					{/if}
				</div>
			</div>
		</div>
		{/if}
	</div>
{/if}

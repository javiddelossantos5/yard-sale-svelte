<script lang="ts">
	import { onMount } from 'svelte';
	import { getYardSaleMessages, sendMessage, markMessageAsRead, type Message } from './api';

	let { isOpen, yardSaleId, yardSaleTitle, otherUserId, otherUsername, currentUserId, onClose } =
		$props<{
			isOpen: boolean;
			yardSaleId: number;
			yardSaleTitle: string;
			otherUserId: number;
			otherUsername: string;
			currentUserId: number;
			onClose: () => void;
		}>();

	let messages = $state<Message[]>([]);
	let newMessage = $state('');
	let loading = $state(true);
	let sending = $state(false);
	let error = $state<string | null>(null);
	let messagesContainer = $state<HTMLDivElement>();

	$effect(() => {
		if (isOpen && yardSaleId && otherUserId) {
			loadMessages();
		}
	});

	async function loadMessages() {
		loading = true;
		error = null;
		try {
			messages = await getYardSaleMessages(yardSaleId);
			// Mark unread messages as read
			const unreadMessages = messages.filter(
				(msg) => !msg.is_read && msg.sender_id !== currentUserId
			);
			for (const message of unreadMessages) {
				await markMessageAsRead(message.id);
			}
			// Scroll to bottom
			setTimeout(() => {
				if (messagesContainer) {
					messagesContainer.scrollTop = messagesContainer.scrollHeight;
				}
			}, 100);
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load messages';
		} finally {
			loading = false;
		}
	}

	async function handleSendMessage() {
		if (!newMessage.trim() || sending) return;

		sending = true;
		try {
			const message = await sendMessage(yardSaleId, otherUserId, newMessage.trim());
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
		const now = new Date();
		const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

		if (diffInHours < 24) {
			return date.toLocaleTimeString('en-US', {
				hour: 'numeric',
				minute: '2-digit',
				hour12: true
			});
		} else {
			return date.toLocaleDateString('en-US', {
				month: 'short',
				day: 'numeric',
				hour: 'numeric',
				minute: '2-digit',
				hour12: true
			});
		}
	}
</script>

{#if isOpen}
	<!-- Modal Backdrop -->
	<div
		class="fixed inset-0 z-50 overflow-y-auto"
		aria-labelledby="modal-title"
		role="dialog"
		aria-modal="true"
	>
		<div
			class="flex min-h-screen items-end justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0"
		>
			<!-- Background overlay -->
			<div
				class="bg-opacity-75 fixed inset-0 bg-gray-500 transition-opacity"
				onclick={closeModal}
				aria-hidden="true"
			></div>

			<!-- Modal panel -->
			<div
				class="relative inline-block transform overflow-hidden rounded-lg bg-white text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:align-middle"
			>
				<!-- Header -->
				<div class="border-b border-gray-200 bg-white px-6 py-4">
					<div class="flex items-center justify-between">
						<div>
							<h3 class="text-lg font-medium text-gray-900" id="modal-title">
								Message {otherUsername}
							</h3>
							<p class="text-sm text-gray-500">About: {yardSaleTitle}</p>
						</div>
						<button
							type="button"
							class="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
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
				<div class="flex h-96 flex-col">
					{#if loading}
						<div class="flex flex-1 items-center justify-center">
							<div class="flex items-center space-x-2">
								<div
									class="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"
								></div>
								<span class="text-sm text-gray-600">Loading messages...</span>
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
								<h3 class="mt-2 text-sm font-medium text-gray-900">Error loading messages</h3>
								<p class="mt-1 text-sm text-gray-500">{error}</p>
								<button
									onclick={loadMessages}
									class="mt-3 inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
								>
									Try Again
								</button>
							</div>
						</div>
					{:else}
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
										<h3 class="mt-2 text-sm font-medium text-gray-900">No messages yet</h3>
										<p class="mt-1 text-sm text-gray-500">
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
						<div class="border-t border-gray-200 p-4">
							<div class="flex space-x-2">
								<textarea
									bind:value={newMessage}
									onkeydown={handleKeyPress}
									placeholder="Type your message..."
									rows="2"
									class="flex-1 resize-none rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none"
									disabled={sending}
								></textarea>
								<button
									onclick={handleSendMessage}
									disabled={sending || !newMessage.trim()}
									class="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
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
	</div>
{/if}

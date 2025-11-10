<script lang="ts">
	import { sendEventMessage, type EventMessage } from '$lib/api';

	interface Props {
		isOpen: boolean;
		eventId: string;
		eventTitle: string;
		onClose: () => void;
		onSuccess: () => void;
	}

	let { isOpen, eventId, eventTitle, onClose, onSuccess }: Props = $props();

	let messageContent = $state('');
	let loading = $state(false);
	let error = $state<string | null>(null);

	async function handleSubmit(event: Event) {
		event.preventDefault();

		if (!messageContent.trim()) {
			error = 'Please enter a message';
			return;
		}

		loading = true;
		error = null;
		try {
			await sendEventMessage(eventId, messageContent.trim());
			messageContent = '';
			onSuccess();
			onClose();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to send message';
		} finally {
			loading = false;
		}
	}

	function handleClose() {
		if (!loading) {
			messageContent = '';
			error = null;
			onClose();
		}
	}
</script>

{#if isOpen}
	<div class="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true">
		<div
			class="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
			onclick={handleClose}
		></div>

		<div class="flex min-h-full items-center justify-center p-4">
			<div
				class="relative w-full max-w-md transform overflow-hidden rounded-2xl bg-white shadow-xl transition-all dark:bg-gray-800"
				onclick={(e) => e.stopPropagation()}
			>
				<!-- Header -->
				<div class="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
					<div class="flex items-center justify-between">
						<h3 class="text-lg font-semibold text-gray-900 dark:text-white">
							Message Event Organizer
						</h3>
						<button
							onclick={handleClose}
							disabled={loading}
							class="rounded-lg p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
							aria-label="Close"
						>
							<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M6 18L18 6M6 6l12 12"
								/>
							</svg>
						</button>
					</div>
					<p class="mt-1 text-sm text-gray-500 dark:text-gray-400">{eventTitle}</p>
				</div>

				<!-- Content -->
				<form onsubmit={handleSubmit} class="px-6 py-4">
					{#if error}
						<div
							class="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400"
						>
							{error}
						</div>
					{/if}

					<div class="mb-4">
						<label
							for="message-content"
							class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
						>
							Message
						</label>
						<textarea
							id="message-content"
							bind:value={messageContent}
							placeholder="Type your message to the event organizer..."
							disabled={loading}
							rows="4"
							class="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder-gray-500 focus:border-green-500 focus:ring-2 focus:ring-green-500 focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-green-500 dark:focus:ring-green-500"
							required
						></textarea>
					</div>

					<!-- Actions -->
					<div class="flex gap-3">
						<button
							type="button"
							onclick={handleClose}
							disabled={loading}
							class="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
						>
							Cancel
						</button>
						<button
							type="submit"
							disabled={loading || !messageContent.trim()}
							class="flex-1 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
						>
							{loading ? 'Sending...' : 'Send Message'}
						</button>
					</div>
				</form>
			</div>
		</div>
	</div>
{/if}


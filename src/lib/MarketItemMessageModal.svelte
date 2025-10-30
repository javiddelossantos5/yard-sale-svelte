<script lang="ts">
	import { sendMarketItemMessage, type MarketItemMessage } from '$lib/api';

	interface Props {
		isOpen: boolean;
		itemId: string;
		itemName: string;
		onClose: () => void;
		onSuccess: () => void;
	}

	let { isOpen, itemId, itemName, onClose, onSuccess }: Props = $props();

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
			await sendMarketItemMessage(itemId, messageContent.trim());
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
			class="flex min-h-screen items-end justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0"
		>
			<div
				class="fixed inset-0 bg-black/50 transition-opacity backdrop-blur-sm"
				onclick={handleClose}
			></div>

			<div
				class="relative inline-block w-full max-w-lg transform overflow-hidden rounded-3xl bg-white/95 p-6 text-left align-bottom shadow-xl ring-1 ring-black/5 transition-all dark:bg-gray-800/95 dark:ring-gray-700 sm:my-8 sm:align-middle"
			>
				<div class="mb-4 flex items-center justify-between">
					<h3 class="text-xl font-semibold text-gray-900 dark:text-white">
						Message Seller
					</h3>
					<button
						onclick={handleClose}
						disabled={loading}
						class="rounded-lg p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
						aria-label="Close"
					>
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

				<p class="mb-4 text-sm text-gray-600 dark:text-gray-400">
					Send a message about: <span class="font-medium">{itemName}</span>
				</p>

				{#if error}
					<div class="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
						{error}
					</div>
				{/if}

				<form onsubmit={handleSubmit}>
					<div class="mb-4">
						<label
							for="message"
							class="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300"
							>Message <span class="text-red-500">*</span></label
						>
						<textarea
							id="message"
							rows="4"
							bind:value={messageContent}
							placeholder="Hi! Is this item still available?"
							required
							disabled={loading}
							class="block w-full rounded-xl border-0 bg-gray-50 px-4 py-3 text-gray-900 placeholder-gray-500 shadow-sm ring-1 ring-gray-300 transition-all duration-200 ring-inset focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:ring-gray-600 dark:focus:ring-blue-400"
						></textarea>
					</div>

					<div class="flex justify-end gap-3">
						<button
							type="button"
							onclick={handleClose}
							disabled={loading}
							class="rounded-xl px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
						>
							Cancel
						</button>
						<button
							type="submit"
							disabled={loading || !messageContent.trim()}
							class="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
						>
							{loading ? 'Sending...' : 'Send Message'}
						</button>
					</div>
				</form>
			</div>
		</div>
	</div>
{/if}


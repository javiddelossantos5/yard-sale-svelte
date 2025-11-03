<script lang="ts">
	import { sendYardSaleMessage } from '$lib/api';

	let {
		isOpen,
		yardSaleId,
		yardSaleTitle,
		onClose,
		onSuccess
	}: {
		isOpen: boolean;
		yardSaleId: string;
		yardSaleTitle: string;
		onClose: () => void;
		onSuccess: () => void;
	} = $props();

	let message = $state('');
	let sending = $state(false);
	let error = $state<string | null>(null);

	async function handleSubmit() {
		if (!message.trim() || sending) return;

		sending = true;
		error = null;

		try {
			await sendYardSaleMessage(yardSaleId, message.trim());
			message = '';
			onSuccess?.();
			onClose();
		} catch (e: any) {
			error = e?.message || 'Failed to send message';
		} finally {
			sending = false;
		}
	}

	function handleBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget) {
			onClose();
		}
	}
</script>

{#if isOpen}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
		onclick={handleBackdropClick}
		onkeydown={(e) => {
			if (e.key === 'Escape') onClose();
		}}
		role="dialog"
		aria-modal="true"
		aria-labelledby="message-modal-title"
		tabindex="-1"
	>
		<div
			class="relative w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-gray-800"
		>
			<!-- Header -->
			<div
				class="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700"
			>
				<h2 id="message-modal-title" class="text-xl font-semibold text-gray-900 dark:text-white">
					Message Seller
				</h2>
				<button
					type="button"
					onclick={onClose}
					class="text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400"
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

			<!-- Content -->
			<div class="p-6">
				<p class="mb-4 text-sm text-gray-600 dark:text-gray-400">
					Send a message to the seller about "{yardSaleTitle}"
				</p>

				{#if error}
					<div class="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
						{error}
					</div>
				{/if}

				<form
					onsubmit={(e) => {
						e.preventDefault();
						handleSubmit();
					}}
				>
					<textarea
						bind:value={message}
						placeholder="Type your message..."
						rows="4"
						disabled={sending}
						class="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm shadow-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-blue-400 dark:focus:ring-blue-400/20"
						required
					></textarea>

					<div class="mt-4 flex justify-end gap-3">
						<button
							type="button"
							onclick={onClose}
							disabled={sending}
							class="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:text-gray-300 dark:hover:bg-gray-700"
						>
							Cancel
						</button>
						<button
							type="submit"
							disabled={sending || !message.trim()}
							class="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
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
								Sending...
							{:else}
								Send Message
							{/if}
						</button>
					</div>
				</form>
			</div>
		</div>
	</div>
{/if}


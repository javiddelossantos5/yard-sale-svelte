<script lang="ts">
	import { FontAwesomeIcon } from '@fortawesome/svelte-fontawesome';
	import { faCheckCircle, faExclamationTriangle, faInfoCircle, faQuestionCircle } from '@fortawesome/free-solid-svg-icons';
	import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';

	let {
		isOpen,
		onClose,
		onConfirm,
		title,
		message,
		confirmText = 'Confirm',
		cancelText = 'Cancel',
		type = 'danger',
		loading = false,
		itemName
	}: {
		isOpen: boolean;
		onClose: () => void;
		onConfirm: () => void;
		title: string;
		message: string;
		confirmText?: string;
		cancelText?: string;
		type?: 'danger' | 'warning' | 'info' | 'success';
		loading?: boolean;
		itemName?: string;
	} = $props();

	function getIcon(): IconDefinition {
		switch (type) {
			case 'danger':
				return faExclamationTriangle;
			case 'warning':
				return faExclamationTriangle;
			case 'info':
				return faInfoCircle;
			case 'success':
				return faCheckCircle;
			default:
				return faQuestionCircle;
		}
	}

	function getIconColors(): string {
		switch (type) {
			case 'danger':
				return 'bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400';
			case 'warning':
				return 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-400';
			case 'info':
				return 'bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400';
			case 'success':
				return 'bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400';
			default:
				return 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400';
		}
	}

	function getButtonColors(): string {
		switch (type) {
			case 'danger':
				return 'bg-red-600 hover:bg-red-700 focus:ring-red-500';
			case 'warning':
				return 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500';
			case 'info':
				return 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500';
			case 'success':
				return 'bg-green-600 hover:bg-green-700 focus:ring-green-500';
			default:
				return 'bg-gray-600 hover:bg-gray-700 focus:ring-gray-500';
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && !loading) {
			onClose();
		}
	}
</script>

{#if isOpen}
	<div
		class="fixed inset-0 z-50 overflow-y-auto"
		role="dialog"
		aria-modal="true"
		aria-labelledby="confirmation-title"
		onkeydown={handleKeydown}
	>
		<div class="flex min-h-full items-center justify-center p-4">
			<!-- Backdrop -->
			<div
				class="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
				onclick={onClose}
				aria-hidden="true"
			></div>

			<!-- Modal Panel -->
			<div
				class="relative z-10 w-full max-w-lg transform overflow-hidden rounded-2xl bg-white/95 text-left align-middle shadow-2xl ring-1 ring-white/20 backdrop-blur-xl transition-all dark:bg-gray-800/95 dark:ring-gray-700/50"
				onclick={(e) => e.stopPropagation()}
			>
				<div class="bg-white/80 px-6 py-6 dark:bg-gray-800/80">
					<!-- Icon and Content -->
					<div class="flex items-start gap-4">
						<div
							class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full {getIconColors()}"
						>
							<FontAwesomeIcon icon={getIcon()} class="h-6 w-6" />
						</div>
						<div class="flex-1">
							<h3
								id="confirmation-title"
								class="text-lg font-semibold leading-6 text-gray-900 dark:text-white"
							>
								{title}
							</h3>
							<div class="mt-3">
								<p class="text-sm leading-relaxed text-gray-600 dark:text-gray-400">
									{#if itemName}
										{@html message.replace('{itemName}', `<span class="font-semibold text-gray-900 dark:text-white">${itemName}</span>`)}
									{:else}
										{message}
									{/if}
								</p>
							</div>
						</div>
					</div>

					<!-- Action Buttons -->
					<div class="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
						<button
							type="button"
							onclick={onClose}
							disabled={loading}
							class="inline-flex w-full justify-center rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition-all duration-200 hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
						>
							{cancelText}
						</button>
						<button
							type="button"
							onclick={onConfirm}
							disabled={loading}
							class="inline-flex w-full justify-center rounded-xl border border-transparent px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-200 focus:ring-2 focus:ring-offset-2 focus:outline-none active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto {getButtonColors()}"
						>
							{#if loading}
								<svg class="mr-2 h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
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
								Processing...
							{:else}
								{confirmText}
							{/if}
						</button>
					</div>
				</div>
			</div>
		</div>
	</div>
{/if}


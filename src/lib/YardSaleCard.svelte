<script lang="ts">
	import { goto } from '$app/navigation';
	import type { YardSale } from './api';
	import MessageModal from './MessageModal.svelte';
	import { getYardSaleStatus, getTimeRemainingMessage } from './yardSaleUtils';
	import { openDirections, getPlatformName } from './mapsUtils';

	let { yardSale }: { yardSale: YardSale } = $props();

	// Message modal state
	let showMessageModal = $state(false);

	// Status calculations
	let status = $derived(getYardSaleStatus(yardSale));
	let timeRemaining = $derived(getTimeRemainingMessage(yardSale));
	let currentUserId = 1; // This should come from auth context in a real app
	let isOwner = $derived(currentUserId === yardSale.owner_id);

	function formatDate(dateString: string): string {
		return new Date(dateString).toLocaleDateString('en-US', {
			weekday: 'short',
			month: 'short',
			day: 'numeric'
		});
	}

	function formatTime(timeString: string): string {
		return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
			hour: 'numeric',
			minute: '2-digit',
			hour12: true
		});
	}

	function getDateRange(): string {
		const startDate = formatDate(yardSale.start_date);
		if (yardSale.end_date) {
			const endDate = formatDate(yardSale.end_date);
			return `${startDate} - ${endDate}`;
		}
		return startDate;
	}

	function getTimeRange(): string {
		const startTime = formatTime(yardSale.start_time);
		const endTime = formatTime(yardSale.end_time);
		return `${startTime} - ${endTime}`;
	}

	function handleCardClick() {
		goto(`/yard-sale/${yardSale.id}`);
	}

	function handleSendMessage(event: Event) {
		event.stopPropagation();
		event.preventDefault();
		if (yardSale.allow_messages) {
			// Use setTimeout to ensure the modal opens after any potential event bubbling
			setTimeout(() => {
				showMessageModal = true;
			}, 0);
		}
	}

	function handleCloseMessageModal() {
		showMessageModal = false;
	}

	function handleAddressClick(event: Event) {
		event.stopPropagation();
		const fullAddress = `${yardSale.address}, ${yardSale.city}, ${yardSale.state} ${yardSale.zip_code}`;
		openDirections(fullAddress);
	}
</script>

<div
	class="cursor-pointer overflow-hidden rounded-2xl bg-white shadow-sm transition-all duration-300 hover:scale-[1.02] hover:shadow-lg active:scale-[0.98] dark:bg-gray-800 dark:shadow-none dark:ring-1 dark:ring-gray-700 dark:hover:ring-gray-600"
	onclick={handleCardClick}
	onkeydown={(e) => e.key === 'Enter' && handleCardClick()}
	role="button"
	tabindex="0"
>
	<!-- Header -->
	<div class="p-5 pb-4">
		<h3 class="mb-4 line-clamp-2 text-lg leading-tight font-semibold text-gray-900 dark:text-white">
			{yardSale.title}
		</h3>

		<!-- Status Indicator -->
		<div class="mb-3">
			{#if status === 'expired'}
				<div
					class="inline-flex items-center rounded-full bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 dark:bg-red-900/10 dark:text-red-300"
				>
					<svg class="mr-1.5 h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
						/>
					</svg>
					<span class="font-medium">Expired</span>
					<span class="ml-1.5 text-xs opacity-70">• {timeRemaining}</span>
				</div>
			{:else if status === 'upcoming'}
				<div
					class="inline-flex items-center rounded-full bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 dark:bg-blue-900/10 dark:text-blue-300"
				>
					<svg class="mr-1.5 h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
						/>
					</svg>
					<span class="font-medium">Upcoming</span>
					<span class="ml-1.5 text-xs opacity-70">• {timeRemaining}</span>
				</div>
			{:else if status === 'active'}
				<div
					class="inline-flex items-center rounded-full bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 dark:bg-green-900/10 dark:text-green-300"
				>
					<svg class="mr-1.5 h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M13 10V3L4 14h7v7l9-11h-7z"
						/>
					</svg>
					<span class="font-medium">Active Now</span>
					<span class="ml-1.5 text-xs opacity-70">• {timeRemaining}</span>
				</div>
			{:else if status === 'on_break'}
				<div class="space-y-1.5">
					<div
						class="inline-flex items-center rounded-full bg-orange-50 px-3 py-1.5 text-xs font-medium text-orange-700 dark:bg-orange-900/10 dark:text-orange-300"
					>
						<svg class="mr-1.5 h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
							/>
						</svg>
						<span class="font-medium">On Break</span>
						<span class="ml-1.5 text-xs opacity-70">• {timeRemaining}</span>
					</div>
					{#if yardSale.status_reason}
						<div class="text-xs text-orange-600 dark:text-orange-400">
							{yardSale.status_reason}
						</div>
					{/if}
				</div>
			{:else if status === 'closed'}
				<div class="space-y-1.5">
					<div
						class="inline-flex items-center rounded-full bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-700 dark:bg-gray-700/50 dark:text-gray-300"
					>
						<svg class="mr-1.5 h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M6 18L18 6M6 6l12 12"
							/>
						</svg>
						<span class="font-medium">Closed</span>
						<span class="ml-1.5 text-xs opacity-70">• {timeRemaining}</span>
					</div>
					{#if yardSale.status_reason}
						<div class="text-xs text-gray-500 dark:text-gray-400">
							{yardSale.status_reason}
						</div>
					{/if}
				</div>
			{/if}
		</div>

		<!-- Location -->
		<div class="mb-4">
			<div class="flex items-start text-gray-600 dark:text-gray-300">
				<svg
					class="mt-0.5 mr-2 h-4 w-4 shrink-0 text-gray-400"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
					></path>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
					></path>
				</svg>
				<div class="flex-1">
					<button
						onclick={handleAddressClick}
						class="text-left text-sm text-blue-600 hover:text-blue-700 hover:underline focus:underline focus:outline-none dark:text-blue-400 dark:hover:text-blue-300"
						title={`Click to open in ${getPlatformName()}`}
					>
						<div class="font-medium">{yardSale.address}</div>
						<div class="text-xs text-gray-500 dark:text-gray-400">
							{yardSale.city}, {yardSale.state}
							{yardSale.zip_code}
						</div>
					</button>
				</div>
			</div>
		</div>

		<!-- Date & Time -->
		<div class="mb-3 flex items-center text-gray-600 dark:text-gray-300">
			<svg class="mr-2 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
				></path>
			</svg>
			<span class="text-sm font-medium">{getDateRange()}</span>
		</div>

		<div class="mb-4 flex items-center text-gray-600 dark:text-gray-300">
			<svg class="mr-2 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
				></path>
			</svg>
			<span class="text-sm font-medium">{getTimeRange()}</span>
		</div>

		<!-- Description -->
		<p class="mb-5 line-clamp-3 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
			{yardSale.description}
		</p>
	</div>

	<!-- Categories -->
	<div class="px-5 pb-4">
		<div class="mb-4 flex flex-wrap gap-2">
			{#each yardSale.categories as category}
				<span
					class="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-800 dark:bg-blue-900/20 dark:text-blue-300"
				>
					{category}
				</span>
			{/each}
		</div>

		<!-- Price Range & Comments -->
		<div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
			<div class="flex items-center font-medium text-green-600 dark:text-green-400">
				<svg class="mr-1.5 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
					></path>
				</svg>
				<span class="text-sm">{yardSale.price_range}</span>
			</div>

			<div class="flex items-center text-gray-500 dark:text-gray-400">
				<svg class="mr-1.5 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
					></path>
				</svg>
				<span class="text-sm">{yardSale.comment_count} comments</span>
			</div>
		</div>
	</div>

	<!-- Footer -->
	<div
		class="border-t border-gray-100 bg-gray-50/50 px-5 py-5 dark:border-gray-700 dark:bg-gray-700/50"
		onclick={(e) => e.stopPropagation()}
		onkeydown={(e) => e.key === 'Enter' && e.stopPropagation()}
		role="button"
		tabindex="0"
	>
		<div class="space-y-4">
			<div class="flex items-center justify-between">
				<div class="text-sm text-gray-600 dark:text-gray-300">
					<span class="font-medium">Contact:</span>
					{yardSale.contact_name}
				</div>
			</div>

			<div class="flex flex-wrap gap-2 sm:gap-3">
				{#if yardSale.contact_phone}
					<a
						href="tel:{yardSale.contact_phone}"
						class="inline-flex min-h-[44px] items-center rounded-full bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-blue-700 active:scale-95"
					>
						<svg class="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
							></path>
						</svg>
						Call
					</a>
				{/if}

				{#if yardSale.allow_messages}
					{@const isDisabled = status === 'expired' || status === 'closed'}
					<button
						onclick={isDisabled ? undefined : handleSendMessage}
						disabled={isDisabled}
						class="inline-flex min-h-[44px] items-center rounded-full bg-green-500 px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-green-600 active:scale-95 disabled:cursor-not-allowed disabled:bg-gray-400 disabled:opacity-50 dark:bg-green-600 dark:hover:bg-green-700 dark:disabled:bg-gray-600"
					>
						<svg class="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
							></path>
						</svg>
						{status === 'expired' ? 'Ended' : status === 'closed' ? 'Closed' : 'Message'}
					</button>
				{/if}

				<!-- Get Directions Button -->
				<button
					onclick={(e) => {
						e.stopPropagation();
						const fullAddress = `${yardSale.address}, ${yardSale.city}, ${yardSale.state} ${yardSale.zip_code}`;
						openDirections(fullAddress);
					}}
					class="inline-flex min-h-[44px] items-center rounded-full bg-indigo-500 px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-indigo-600 active:scale-95 dark:bg-indigo-600 dark:hover:bg-indigo-700"
					title={`Get directions in ${getPlatformName()}`}
				>
					<svg class="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
						/>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
						/>
					</svg>
					Directions
				</button>
			</div>
		</div>

		<!-- Payment Methods -->
		<div class="mt-4 text-sm text-gray-500 dark:text-gray-400">
			<span class="font-medium">Payment:</span>
			{yardSale.payment_methods.join(', ')}
		</div>
	</div>

	<!-- Message Modal -->
	<MessageModal
		isOpen={showMessageModal}
		yardSaleId={yardSale.id}
		yardSaleTitle={yardSale.title}
		otherUserId={isOwner ? currentUserId : yardSale.owner_id}
		otherUsername={isOwner ? 'You' : yardSale.owner_username}
		{currentUserId}
		onClose={handleCloseMessageModal}
	/>
</div>

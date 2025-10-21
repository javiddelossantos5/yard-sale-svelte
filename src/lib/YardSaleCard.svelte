<script lang="ts">
	import { goto } from '$app/navigation';
	import type { YardSale } from './api';
	import MessageModal from './MessageModal.svelte';
	import { getYardSaleStatus, getTimeRemainingMessage } from './yardSaleUtils';
	import { openDirections, getPlatformName } from './mapsUtils';
	import { isYardSaleVisited, toggleYardSaleVisited } from './visitedYardSales';
	import { FontAwesomeIcon } from '@fortawesome/svelte-fontawesome';

	let { yardSale, onVisitedChange }: { yardSale: YardSale; onVisitedChange?: () => void } =
		$props();

	// Message modal state
	let showMessageModal = $state(false);

	// Status calculations
	let status = $derived(getYardSaleStatus(yardSale));
	let timeRemaining = $derived(getTimeRemainingMessage(yardSale));
	let currentUserId = 1; // This should come from auth context in a real app
	let isOwner = $derived(currentUserId === yardSale.owner_id);

	// Visited state
	let isVisited = $state(isYardSaleVisited(yardSale.id));

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

	function handleToggleVisited(event: Event) {
		event.stopPropagation();
		isVisited = toggleYardSaleVisited(yardSale.id);
		// Trigger re-sorting on the main page
		onVisitedChange?.();
	}
</script>

<div
	class="cursor-pointer overflow-hidden rounded-2xl shadow-sm transition-all duration-300 hover:scale-[1.02] hover:shadow-lg active:scale-[0.98] {isVisited
		? 'bg-gray-100 opacity-60 dark:bg-gray-900 dark:opacity-60'
		: 'bg-white dark:bg-gray-800 dark:shadow-none dark:ring-1 dark:ring-gray-700 dark:hover:ring-gray-600'}"
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

		<!-- Visited Indicator -->
		{#if isVisited}
			<div class="mb-3">
				<div
					class="inline-flex items-center rounded-full bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-300"
				>
					<FontAwesomeIcon icon="check" class="mr-1.5 h-3.5 w-3.5" />
					<span class="font-medium">Already Visited</span>
				</div>
			</div>
		{/if}

		<!-- Status Indicator -->
		<div class="mb-3">
			{#if status === 'expired'}
				<div
					class="inline-flex items-center rounded-full bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 dark:bg-red-900/10 dark:text-red-300"
				>
					<FontAwesomeIcon icon="exclamation-triangle" class="mr-1.5 h-3.5 w-3.5" />
					<span class="font-medium">Expired</span>
					<span class="ml-1.5 text-xs opacity-70">• {timeRemaining}</span>
				</div>
			{:else if status === 'upcoming'}
				<div
					class="inline-flex items-center rounded-full bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 dark:bg-blue-900/10 dark:text-blue-300"
				>
					<FontAwesomeIcon icon="clock" class="mr-1.5 h-3.5 w-3.5" />
					<span class="font-medium">Upcoming</span>
					<span class="ml-1.5 text-xs opacity-70">• {timeRemaining}</span>
				</div>
			{:else if status === 'active'}
				<div
					class="inline-flex items-center rounded-full bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 dark:bg-green-900/10 dark:text-blue-300"
				>
					<FontAwesomeIcon icon="check-circle" class="mr-1.5 h-3.5 w-3.5" />
					<span class="font-medium">Active Now</span>
					<span class="ml-1.5 text-xs opacity-70">• {timeRemaining}</span>
				</div>
			{:else if status === 'on_break'}
				<div class="space-y-1.5">
					<div
						class="inline-flex items-center rounded-full bg-orange-50 px-3 py-1.5 text-xs font-medium text-orange-700 dark:bg-orange-900/10 dark:text-orange-300"
					>
						<FontAwesomeIcon icon="clock" class="mr-1.5 h-3.5 w-3.5" />
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
		<div class="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
			{#each yardSale.categories as category}
				<span
					class="inline-flex items-center justify-center rounded-xl border border-gray-200/50 bg-blue-50/60 px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:bg-blue-50 hover:shadow-md dark:border-gray-700/50 dark:bg-blue-900/20 dark:text-gray-200 dark:hover:bg-blue-900/30"
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

			<div class="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-3">
				{#if yardSale.contact_phone}
					<a
						href="tel:{yardSale.contact_phone}"
						class="inline-flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white transition-all hover:bg-blue-700 active:scale-95"
						title="Call {yardSale.contact_name}"
					>
						<FontAwesomeIcon icon="phone" class="h-5 w-5" />
					</a>
				{/if}

				{#if yardSale.allow_messages}
					{@const isDisabled = status === 'expired' || status === 'closed'}
					<button
						onclick={isDisabled ? undefined : handleSendMessage}
						disabled={isDisabled}
						class="inline-flex h-10 w-10 items-center justify-center rounded-full bg-green-500 text-white transition-all hover:bg-green-600 active:scale-95 disabled:cursor-not-allowed disabled:bg-gray-400 disabled:opacity-50 dark:bg-green-600 dark:hover:bg-green-700 dark:disabled:bg-gray-600"
						title={status === 'expired'
							? 'Yard sale has ended'
							: status === 'closed'
								? 'Yard sale is closed'
								: `Message ${yardSale.contact_name}`}
					>
						<FontAwesomeIcon icon="envelope" class="h-5 w-5" />
					</button>
				{/if}

				<!-- Get Directions Button -->
				<button
					onclick={(e) => {
						e.stopPropagation();
						const fullAddress = `${yardSale.address}, ${yardSale.city}, ${yardSale.state} ${yardSale.zip_code}`;
						openDirections(fullAddress);
					}}
					class="inline-flex h-10 w-10 items-center justify-center rounded-full bg-indigo-500 text-white transition-all hover:bg-indigo-600 active:scale-95 dark:bg-indigo-600 dark:hover:bg-indigo-700"
					title={`Get directions in ${getPlatformName()}`}
				>
					<FontAwesomeIcon icon="map-marker-alt" class="h-5 w-5" />
				</button>

				<!-- Visited Toggle Button - Only show for active/started yard sales -->
				{#if status !== 'upcoming'}
					<button
						onclick={handleToggleVisited}
						class="inline-flex h-10 w-10 items-center justify-center rounded-full transition-all active:scale-95 {isVisited
							? 'bg-gray-500 text-white hover:bg-gray-600 dark:bg-gray-600 dark:hover:bg-gray-700'
							: 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600'}"
						title={isVisited ? 'Mark as not visited' : 'Mark as visited'}
					>
						{#if isVisited}
							<FontAwesomeIcon icon="check" class="h-5 w-5" />
						{:else}
							<FontAwesomeIcon icon="eye" class="h-5 w-5" />
						{/if}
					</button>
				{/if}
			</div>
		</div>

		<!-- Payment Methods -->
		<div class="mt-4">
			<div class="mb-2 text-sm font-medium text-gray-500 dark:text-gray-400">Payment:</div>
			<div class="flex flex-wrap gap-2">
				{#each yardSale.payment_methods as method}
					{#if method.toLowerCase().includes('venmo') && yardSale.venmo_url}
						<a
							href={yardSale.venmo_url}
							target="_blank"
							rel="noopener noreferrer"
							class="inline-flex items-center rounded-full bg-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500"
							title="Pay with Venmo"
						>
							<FontAwesomeIcon icon="check-circle" class="mr-1.5 h-3.5 w-3.5" />
							{method}
						</a>
					{:else}
						<div
							class="inline-flex items-center rounded-full bg-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 dark:bg-gray-600 dark:text-gray-200"
						>
							{#if method.toLowerCase().includes('cash')}
								<FontAwesomeIcon icon="dollar-sign" class="mr-1.5 h-3.5 w-3.5" />
							{:else if method.toLowerCase().includes('venmo')}
								<FontAwesomeIcon icon="check-circle" class="mr-1.5 h-3.5 w-3.5" />
							{:else if method.toLowerCase().includes('paypal')}
								<FontAwesomeIcon icon={['fab', 'paypal']} class="mr-1.5 h-3.5 w-3.5" />
							{:else if method.toLowerCase().includes('zelle')}
								<FontAwesomeIcon icon="check-circle" class="mr-1.5 h-3.5 w-3.5" />
							{:else if method.toLowerCase().includes('apple')}
								<FontAwesomeIcon icon={['fab', 'apple']} class="mr-1.5 h-3.5 w-3.5" />
							{:else if method.toLowerCase().includes('google')}
								<FontAwesomeIcon icon={['fab', 'google']} class="mr-1.5 h-3.5 w-3.5" />
							{:else if method.toLowerCase().includes('card') || method
									.toLowerCase()
									.includes('credit') || method.toLowerCase().includes('debit')}
								<FontAwesomeIcon icon="credit-card" class="mr-1.5 h-3.5 w-3.5" />
							{:else if method.toLowerCase().includes('check')}
								<FontAwesomeIcon icon="check" class="mr-1.5 h-3.5 w-3.5" />
							{:else}
								<FontAwesomeIcon icon="dollar-sign" class="mr-1.5 h-3.5 w-3.5" />
							{/if}
							{method}
						</div>
					{/if}
				{/each}
			</div>
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

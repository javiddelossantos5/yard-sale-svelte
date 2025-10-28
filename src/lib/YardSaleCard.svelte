<script lang="ts">
	import { goto } from '$app/navigation';
	import type { YardSale } from './api';
	import { getYardSaleStatus, getTimeRemainingMessage } from './yardSaleUtils';
	import { openDirections, getPlatformName } from './mapsUtils';
	import { isYardSaleVisited, toggleYardSaleVisited } from './visitedYardSales';
	import { FontAwesomeIcon } from '@fortawesome/svelte-fontawesome';
	import { getPaymentMethodIcon } from './paymentUtils';
	import { getCurrentUser, type CurrentUser, getAuthenticatedImageUrl } from './api';

	let { yardSale, onVisitedChange }: { yardSale: YardSale; onVisitedChange?: () => void } =
		$props();

	// Payment methods state - using hardcoded fallback methods
	let availablePaymentMethods = $state<any[]>([
		{ id: 'cash', name: 'Cash', icon: 'dollar-sign', icon_type: 'solid' },
		{ id: 'credit-card', name: 'Credit Card', icon: 'credit-card', icon_type: 'solid' },
		{ id: 'debit-card', name: 'Debit Card', icon: 'credit-card', icon_type: 'solid' },
		{ id: 'paypal', name: 'PayPal', icon: 'paypal', icon_type: 'brand' },
		{ id: 'zelle', name: 'Zelle', icon: 'check-circle', icon_type: 'solid' },
		{ id: 'apple', name: 'Apple Pay', icon: 'apple', icon_type: 'brand' },
		{ id: 'google', name: 'Google Pay', icon: 'google', icon_type: 'brand' },
		{ id: 'square', name: 'Square', icon: 'credit-card', icon_type: 'solid' }
	]);

	// Status calculations
	let status = $derived(getYardSaleStatus(yardSale));
	let timeRemaining = $derived(getTimeRemainingMessage(yardSale));

	// User state
	let currentUser = $state<CurrentUser | null>(null);
	let currentUserId = $derived(currentUser?.id || null);
	let isOwner = $derived(currentUserId === yardSale.owner_id);

	// Load current user on mount
	$effect(() => {
		loadCurrentUser();
	});

	async function loadCurrentUser() {
		try {
			currentUser = await getCurrentUser();
		} catch (error) {
			console.warn('Failed to load current user:', error);
			// User might not be logged in, that's okay
		}
	}

	// Visited state
	let isVisited = $state(isYardSaleVisited(yardSale.id, yardSale));

	function formatDate(dateString: string): string {
		return new Date(dateString).toLocaleDateString('en-US', {
			weekday: 'short',
			month: 'short',
			day: 'numeric',
			timeZone: 'America/Denver'
		});
	}

	function formatTime(timeString: string): string {
		return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
			hour: 'numeric',
			minute: '2-digit',
			hour12: true,
			timeZone: 'America/Denver'
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

	function handleAddressClick(event: Event) {
		event.stopPropagation();
		const fullAddress = `${yardSale.address}, ${yardSale.city}, ${yardSale.state} ${yardSale.zip_code}`;
		openDirections(fullAddress);
	}

	async function handleToggleVisited(event: Event) {
		event.stopPropagation();
		isVisited = await toggleYardSaleVisited(yardSale.id, yardSale);
		// Trigger re-sorting on the main page
		onVisitedChange?.();
	}
</script>

<div
	class="group cursor-pointer overflow-hidden rounded-3xl bg-white/80 shadow-xl shadow-black/5 backdrop-blur-xl transition-all duration-500 ease-out hover:-translate-y-1 hover:scale-[1.02] hover:shadow-2xl hover:shadow-black/10 active:scale-[0.98] dark:bg-gray-800/80 dark:shadow-black/20 dark:hover:shadow-black/30"
	onclick={handleCardClick}
	onkeydown={(e) => e.key === 'Enter' && handleCardClick()}
	role="button"
	tabindex="0"
>
	<!-- Header -->
	<div class="p-6 pb-5">
		<h3 class="mb-3 line-clamp-2 text-xl leading-tight font-bold text-gray-900 dark:text-white">
			{yardSale.title}
		</h3>

		<!-- Featured Image -->
		{#if yardSale.photos && yardSale.photos.length > 0}
			<div class="mb-4">
				<img
					src={getAuthenticatedImageUrl(yardSale.photos[0])}
					alt={yardSale.title}
					class="h-48 w-full rounded-2xl object-cover shadow-lg"
					loading="lazy"
				/>
			</div>
		{/if}

		<!-- Owner Information -->
		<div class="mb-5 flex items-center justify-between">
			<button
				onclick={(e) => {
					e.stopPropagation();
					goto(`/profile/${yardSale.owner_id}`);
				}}
				class="flex items-center rounded-full bg-gray-100/60 px-3 py-2 text-sm text-gray-700 transition-all duration-300 hover:bg-blue-100/60 hover:text-blue-700 dark:bg-gray-700/60 dark:text-gray-200 dark:hover:bg-blue-900/30 dark:hover:text-blue-300"
			>
				<div
					class="mr-2 flex h-6 w-6 items-center justify-center rounded-full bg-linear-to-br from-blue-500 to-purple-600"
				>
					<FontAwesomeIcon icon="user" class="h-3 w-3 text-white" />
				</div>
				<span class="font-semibold">by {yardSale.owner_username}</span>
				{#if yardSale.owner_average_rating}
					<div
						class="ml-2 flex items-center rounded-full bg-yellow-100/60 px-2 py-1 dark:bg-yellow-900/30"
					>
						<FontAwesomeIcon icon="star" class="h-3 w-3 text-yellow-500" />
						<span class="ml-1 text-xs font-bold text-yellow-700 dark:text-yellow-300">
							{yardSale.owner_average_rating.toFixed(1)}
						</span>
					</div>
				{/if}
			</button>
		</div>

		<!-- Visited Indicator -->
		{#if isVisited}
			<div class="mb-4">
				<div
					class="inline-flex items-center rounded-full bg-gray-200/60 px-4 py-2 text-xs font-bold text-gray-700 shadow-sm backdrop-blur-sm dark:bg-gray-600/60 dark:text-gray-200"
				>
					<FontAwesomeIcon icon="check" class="mr-2 h-4 w-4" />
					<span>Already Visited</span>
				</div>
			</div>
		{/if}

		<!-- Status Indicator -->
		<div class="mb-4">
			{#if status === 'expired'}
				<div
					class="inline-flex items-center rounded-full bg-red-100/60 px-4 py-2 text-xs font-bold text-red-700 shadow-sm backdrop-blur-sm dark:bg-red-900/30 dark:text-red-300"
				>
					<FontAwesomeIcon icon="exclamation-triangle" class="mr-2 h-4 w-4" />
					<span>Expired</span>
					<span class="ml-2 text-xs opacity-80">• {timeRemaining}</span>
				</div>
			{:else if status === 'upcoming'}
				<div
					class="inline-flex items-center rounded-full bg-blue-100/60 px-4 py-2 text-xs font-bold text-blue-700 shadow-sm backdrop-blur-sm dark:bg-blue-900/30 dark:text-blue-300"
				>
					<FontAwesomeIcon icon="clock" class="mr-2 h-4 w-4" />
					<span>Upcoming</span>
					<span class="ml-2 text-xs opacity-80">• {timeRemaining}</span>
				</div>
			{:else if status === 'active'}
				<div
					class="inline-flex items-center rounded-full bg-green-100/60 px-4 py-2 text-xs font-bold text-green-700 shadow-sm backdrop-blur-sm dark:bg-green-900/30 dark:text-green-300"
				>
					<FontAwesomeIcon icon="check-circle" class="mr-2 h-4 w-4" />
					<span>Active Now</span>
					<span class="ml-2 text-xs opacity-80">• {timeRemaining}</span>
				</div>
			{:else if status === 'on_break'}
				<div class="space-y-2">
					<div
						class="inline-flex items-center rounded-full bg-orange-100/60 px-4 py-2 text-xs font-bold text-orange-700 shadow-sm backdrop-blur-sm dark:bg-orange-900/30 dark:text-orange-300"
					>
						<FontAwesomeIcon icon="clock" class="mr-2 h-4 w-4" />
						<span>On Break</span>
						<span class="ml-2 text-xs opacity-80">• {timeRemaining}</span>
					</div>
					{#if yardSale.status_reason}
						<div class="text-xs text-orange-600 dark:text-orange-400">
							{yardSale.status_reason}
						</div>
					{/if}
				</div>
			{:else if status === 'closed'}
				<div class="space-y-2">
					<div
						class="inline-flex items-center rounded-full bg-gray-100/60 px-4 py-2 text-xs font-bold text-gray-700 shadow-sm backdrop-blur-sm dark:bg-gray-600/60 dark:text-gray-300"
					>
						<svg class="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M6 18L18 6M6 6l12 12"
							/>
						</svg>
						<span>Closed</span>
						<span class="ml-2 text-xs opacity-80">• {timeRemaining}</span>
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
		<div class="mb-5">
			<div
				class="flex items-start rounded-2xl bg-gray-50/60 p-4 backdrop-blur-sm dark:bg-gray-700/60"
			>
				<div
					class="mr-3 flex h-8 w-8 items-center justify-center rounded-full bg-blue-100/60 dark:bg-blue-900/30"
				>
					<svg
						class="h-4 w-4 text-blue-600 dark:text-blue-400"
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
				</div>
				<div class="flex-1">
					<button
						onclick={handleAddressClick}
						class="text-left transition-all duration-300 hover:scale-105"
						title={`Click to open in ${getPlatformName()}`}
					>
						<div class="text-sm font-bold text-gray-900 dark:text-white">{yardSale.address}</div>
						<div class="text-xs text-gray-600 dark:text-gray-300">
							{yardSale.city}, {yardSale.state}
							{yardSale.zip_code}
						</div>
					</button>
				</div>
			</div>
		</div>

		<!-- Date & Time -->
		<div class="mb-4 space-y-3">
			<div
				class="flex items-center rounded-2xl bg-purple-50/60 p-3 backdrop-blur-sm dark:bg-purple-900/20"
			>
				<div
					class="mr-3 flex h-7 w-7 items-center justify-center rounded-full bg-purple-100/60 dark:bg-purple-800/40"
				>
					<svg
						class="h-4 w-4 text-purple-600 dark:text-purple-400"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
						></path>
					</svg>
				</div>
				<span class="text-sm font-bold text-gray-900 dark:text-white">{getDateRange()}</span>
			</div>

			<div
				class="flex items-center rounded-2xl bg-indigo-50/60 p-3 backdrop-blur-sm dark:bg-indigo-900/20"
			>
				<div
					class="mr-3 flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100/60 dark:bg-indigo-800/40"
				>
					<svg
						class="h-4 w-4 text-indigo-600 dark:text-indigo-400"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
						></path>
					</svg>
				</div>
				<span class="text-sm font-bold text-gray-900 dark:text-white">{getTimeRange()}</span>
			</div>
		</div>

		<!-- Description -->
		<div class="mb-6 rounded-2xl bg-gray-50/40 p-4 backdrop-blur-sm dark:bg-gray-700/40">
			<p class="line-clamp-3 text-sm leading-relaxed text-gray-700 dark:text-gray-200">
				{yardSale.description}
			</p>
		</div>
	</div>

	<!-- Categories -->
	<div class="px-6 pb-5">
		<div class="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
			{#each yardSale.categories as category}
				<span
					class="inline-flex items-center justify-center rounded-2xl bg-linear-to-r from-blue-100/60 to-purple-100/60 px-4 py-2.5 text-center text-xs font-bold text-gray-800 shadow-sm backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md dark:from-blue-900/30 dark:to-purple-900/30 dark:text-gray-100"
				>
					{category}
				</span>
			{/each}
		</div>

		<!-- Price Range & Comments -->
		<div class="flex flex-col gap-3 sm:flex-row sm:items-center">
			<div class="flex-1">
				{#if yardSale.price_range}
					<div
						class="flex items-center rounded-2xl bg-green-100/60 px-4 py-2.5 backdrop-blur-sm dark:bg-green-900/20"
					>
						<div
							class="mr-3 flex h-7 w-7 items-center justify-center rounded-full bg-green-200/60 dark:bg-green-800/40"
						>
							<svg
								class="h-4 w-4 text-green-600 dark:text-green-400"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
								></path>
							</svg>
						</div>
						<span class="text-sm font-bold text-green-700 dark:text-green-300"
							>{yardSale.price_range}</span
						>
					</div>
				{/if}
			</div>
			{#if yardSale.comment_count}
				<div
					class="flex items-center rounded-2xl bg-gray-100/60 px-4 py-2.5 backdrop-blur-sm dark:bg-gray-700/60"
				>
					<div
						class="mr-3 flex h-7 w-7 items-center justify-center rounded-full bg-gray-200/60 dark:bg-gray-600/40"
					>
						<svg
							class="h-4 w-4 text-gray-600 dark:text-gray-400"
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
					</div>
					<span class="text-sm font-bold text-gray-700 dark:text-gray-300"
						>{yardSale.comment_count} comments</span
					>
				</div>
			{/if}
		</div>
	</div>

	<!-- Footer -->
	<div
		class="h-full border-t border-gray-200/50 bg-linear-to-r from-gray-50/80 to-gray-100/80 px-6 py-6 backdrop-blur-xl dark:border-gray-600/50 dark:from-gray-700/80 dark:to-gray-800/80"
		onclick={(e) => e.stopPropagation()}
		onkeydown={(e) => e.key === 'Enter' && e.stopPropagation()}
		role="button"
		tabindex="0"
	>
		<div class="space-y-5">
			<div class="flex items-center justify-between">
				<div class="rounded-2xl bg-white/60 px-4 py-2.5 backdrop-blur-sm dark:bg-gray-600/60">
					<div class="text-sm text-gray-700 dark:text-gray-200">
						<span class="font-bold">Contact:</span>
						<span class="ml-1 font-semibold">{yardSale.contact_name}</span>
					</div>
				</div>
			</div>

			<div class="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-3">
				{#if yardSale.contact_phone}
					<a
						href="tel:{yardSale.contact_phone}"
						class="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-linear-to-r from-blue-500 to-blue-600 px-4 text-white shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-xl active:scale-95 sm:w-12 sm:px-0"
						title="Call {yardSale.contact_name}"
					>
						<FontAwesomeIcon icon="phone" class="h-5 w-5" />
						<span class="text-sm font-bold sm:hidden">Call</span>
					</a>
				{/if}

				<!-- Get Directions Button -->
				<button
					onclick={(e) => {
						e.stopPropagation();
						const fullAddress = `${yardSale.address}, ${yardSale.city}, ${yardSale.state} ${yardSale.zip_code}`;
						openDirections(fullAddress);
					}}
					class="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-linear-to-r from-indigo-500 to-indigo-600 px-4 text-white shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-xl active:scale-95 sm:w-12 sm:px-0"
					title={`Get directions in ${getPlatformName()}`}
				>
					<FontAwesomeIcon icon="map-marker-alt" class="h-5 w-5" />
					<span class="text-sm font-bold sm:hidden">Directions</span>
				</button>

				<!-- Visited Toggle Button - Only show for active/started yard sales -->
				{#if status !== 'upcoming'}
					<button
						onclick={handleToggleVisited}
						class="inline-flex h-12 items-center justify-center gap-2 rounded-2xl px-4 transition-all duration-300 active:scale-95 sm:w-12 sm:px-0 {isVisited
							? 'bg-linear-to-r from-gray-500 to-gray-600 text-white shadow-lg hover:-translate-y-1 hover:shadow-xl dark:from-gray-600 dark:to-gray-700'
							: 'border-2 border-gray-300 bg-white/80 text-gray-700 shadow-lg backdrop-blur-sm hover:-translate-y-1 hover:shadow-xl dark:border-gray-600 dark:bg-gray-700/80 dark:text-gray-200'}"
						title={isVisited ? 'Mark as not visited' : 'Mark as visited'}
					>
						{#if isVisited}
							<FontAwesomeIcon icon="check" class="h-5 w-5" />
						{:else}
							<FontAwesomeIcon icon="eye" class="h-5 w-5" />
						{/if}
						<span class="text-sm font-bold sm:hidden"
							>{isVisited ? 'Marked Visited' : 'Mark as Visited'}</span
						>
					</button>
				{/if}
			</div>
		</div>

		<!-- Payment Methods -->
		<div class="mt-5">
			<div class="mb-3 text-sm font-bold text-gray-600 dark:text-gray-300">Payment Methods:</div>
			<div class="flex flex-wrap gap-2.5">
				{#each yardSale.payment_methods as method}
					{@const iconInfo = getPaymentMethodIcon(method, availablePaymentMethods)}
					<div
						class="inline-flex items-center rounded-2xl bg-white/80 px-4 py-2.5 text-xs font-bold text-gray-700 shadow-lg backdrop-blur-sm dark:bg-gray-600/80 dark:text-gray-200"
					>
						<FontAwesomeIcon
							icon={iconInfo.iconType === 'brand' ? ['fab', iconInfo.icon] : (iconInfo.icon as any)}
							class="mr-2 h-4 w-4"
						/>
						{method}
					</div>
				{/each}

				<!-- Venmo URL link (independent of payment methods) -->
				{#if yardSale.venmo_url}
					<a
						href={yardSale.venmo_url}
						target="_blank"
						rel="noopener noreferrer"
						class="inline-flex items-center rounded-2xl bg-linear-to-r from-blue-500 to-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
						title="Pay with Venmo"
					>
						<FontAwesomeIcon icon="check-circle" class="mr-2 h-4 w-4" />
						Venmo
					</a>
				{/if}
			</div>
		</div>
	</div>
</div>

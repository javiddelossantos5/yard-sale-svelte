<script lang="ts">
	import { goto } from '$app/navigation';
	import type { MarketItem } from '$lib/api';
	import { getAuthenticatedImageUrl } from '$lib/api';
	import { FontAwesomeIcon } from '@fortawesome/svelte-fontawesome';
	import { faFacebook } from '@fortawesome/free-brands-svg-icons';
	import {
		faCommentDots,
		faEnvelope,
		faHandshake,
		faMoneyBillWave,
		faPhone,
		faTag,
		faUser,
		faStar,
		faChevronLeft,
		faChevronRight,
		faShieldAlt
	} from '@fortawesome/free-solid-svg-icons';

	let { item, hideStatusBadge = false }: { item: MarketItem; hideStatusBadge?: boolean } = $props();

	// Image carousel state for card
	let cardImageIndex = $state(0);

	function getDisplayPhotos() {
		if (!item.photos || item.photos.length === 0) return [];

		const photos = item.photos;
		const featuredImage = item.featured_image;
		
		// Always put featured image first if it exists
		if (featuredImage) {
			if (photos.includes(featuredImage)) {
				// Featured image is in the photos array, put it first
				return [featuredImage, ...photos.filter((p) => p !== featuredImage)];
			} else {
				// Featured image exists but not in photos array, add it first anyway
				return [featuredImage, ...photos];
			}
		}
		return photos;
	}

	// Reactive image URL that updates when token becomes available
	const currentImageUrl = $derived(() => {
		const displayPhotos = getDisplayPhotos();
		if (displayPhotos.length === 0) return '';
		return getAuthenticatedImageUrl(displayPhotos[cardImageIndex] || '');
	});

	// Reset to first image (featured) whenever item changes
	$effect(() => {
		if (item) {
			cardImageIndex = 0;
		}
	});

	function nextCardImage(e: Event) {
		e.preventDefault();
		e.stopPropagation();
		const photos = getDisplayPhotos();
		if (photos.length > 0) {
			cardImageIndex = (cardImageIndex + 1) % photos.length;
		}
	}

	function previousCardImage(e: Event) {
		e.preventDefault();
		e.stopPropagation();
		const photos = getDisplayPhotos();
		if (photos.length > 0) {
			cardImageIndex = cardImageIndex === 0 ? photos.length - 1 : cardImageIndex - 1;
		}
	}

	function formatPrice(price: number): string {
		return new Intl.NumberFormat('en-US', {
			minimumFractionDigits: 2,
			maximumFractionDigits: 2
		}).format(price);
	}

	function getDaysAgo(dateString: string): string {
		try {
			const date = new Date(dateString);
			const now = new Date();
			const diffTime = Math.abs(now.getTime() - date.getTime());
			const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

			if (diffDays === 0) return 'today';
			if (diffDays === 1) return '1 day ago';
			return `${diffDays} days ago`;
		} catch {
			return '';
		}
	}

	function formatPhone(phone: string): string {
		if (!phone) return '';
		// Remove all non-digits
		const digits = phone.replace(/\D/g, '');
		// Format as (XXX) XXX-XXXX
		if (digits.length === 10) {
			return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
		}
		// If it has 11 digits and starts with 1, format as 1 (XXX) XXX-XXXX
		if (digits.length === 11 && digits[0] === '1') {
			return `1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
		}
		// Return original if it doesn't match expected format
		return phone;
	}

	function openItem(e?: Event) {
		if (e) {
			e.preventDefault();
			e.stopPropagation();
		}
		console.log('[MarketItemCard] Opening item:', item.id, 'Target URL:', `/market/${item.id}`);
		goto(`/market/${item.id}`);
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			event.stopPropagation();
			openItem();
		}
	}
</script>

<div
	role="button"
	tabindex="0"
	onclick={(e) => openItem(e)}
	onkeydown={handleKeydown}
	ontouchstart={(e) => {
		// Prevent event bubbling on touch devices
		e.stopPropagation();
	}}
	class="group cursor-pointer overflow-hidden rounded-3xl bg-white/80 shadow-[0_1px_0_rgba(255,255,255,0.6),0_20px_40px_rgba(0,0,0,0.06)] ring-1 ring-black/5 backdrop-blur-xl transition-all duration-300 ease-out outline-none hover:-translate-y-1 hover:shadow-[0_1px_0_rgba(255,255,255,0.7),0_30px_60px_rgba(0,0,0,0.1)] focus-visible:-translate-y-1 focus-visible:ring-2 focus-visible:ring-blue-500/70 active:scale-[0.99] dark:bg-gray-800/80 dark:ring-gray-700"
>
	<!-- Image Section -->
	<div class="relative overflow-hidden">
		{#if item.featured_image || (item.photos && item.photos.length > 0)}
			{@const displayPhotos = getDisplayPhotos()}
			{@const hasMultipleImages = displayPhotos.length > 1}
			<img
				src={currentImageUrl()}
				alt={item.name}
				loading="lazy"
				class="aspect-[16/10] w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.05]"
			/>

			<!-- Navigation Buttons (only show if multiple images) -->
			{#if hasMultipleImages}
				<!-- Previous Button -->
				<button
					onclick={previousCardImage}
					onmousedown={(e) => e.stopPropagation()}
					ontouchstart={(e) => e.stopPropagation()}
					class="absolute top-1/2 left-2 z-10 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white transition-all hover:bg-black/70 active:scale-95 dark:bg-white/20 dark:hover:bg-white/30"
					aria-label="Previous image"
				>
					<FontAwesomeIcon icon={faChevronLeft} class="h-4 w-4" />
				</button>

				<!-- Next Button -->
				<button
					onclick={nextCardImage}
					onmousedown={(e) => e.stopPropagation()}
					ontouchstart={(e) => e.stopPropagation()}
					class="absolute top-1/2 right-2 z-10 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white transition-all hover:bg-black/70 active:scale-95 dark:bg-white/20 dark:hover:bg-white/30"
					aria-label="Next image"
				>
					<FontAwesomeIcon icon={faChevronRight} class="h-4 w-4" />
				</button>

				<!-- Image Counter -->
				<div
					class="absolute top-2 right-2 z-10 rounded-full bg-black/50 px-2.5 py-1 text-xs font-medium text-white dark:bg-white/20"
					onclick={(e) => e.stopPropagation()}
					onmousedown={(e) => e.stopPropagation()}
				>
					{cardImageIndex + 1} / {displayPhotos.length}
				</div>
			{/if}
		{:else}
			<div
				class="aspect-[16/10] w-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600"
			></div>
		{/if}

		<!-- Overlay Badges -->
		<div class="absolute inset-0 flex items-start justify-between p-3">
			<!-- Comment Count -->
			<div
				class="flex items-center gap-1.5 rounded-full bg-black/50 px-2.5 py-1.5 text-xs font-medium text-white backdrop-blur-md"
			>
				<FontAwesomeIcon icon={faCommentDots} class="h-3 w-3" />
				<span>{item.comment_count}</span>
			</div>

			<!-- Status Badge -->
			{#if !hideStatusBadge}
				<div
					class="rounded-full px-3 py-1.5 text-xs font-semibold backdrop-blur-md {item.status ===
					'sold'
						? 'bg-red-600/90 text-white'
						: item.status === 'hidden'
							? 'bg-gray-600/90 text-white'
							: 'bg-green-600/90 text-white'}"
				>
					{item.status === 'sold' ? 'Sold' : item.status === 'hidden' ? 'Hidden' : 'Available'}
				</div>
			{/if}
		</div>
	</div>

	<!-- Content Section -->
	<div class="p-4">
		<!-- Title and Description -->
		<h3
			class="mb-1.5 line-clamp-1 text-lg font-semibold tracking-tight text-gray-900 dark:text-white"
		>
			{item.name}
		</h3>
		{#if item.description}
			<p class="mb-2 line-clamp-2 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
				{item.description}
			</p>
		{/if}

		<!-- Seller Information -->
		<div class="mb-2">
			<button
				onclick={(e) => {
					e.stopPropagation();
					goto(`/profile/${item.owner_id}`);
				}}
				class="flex items-center rounded-full bg-gray-100/60 px-2.5 py-1.5 text-xs text-gray-700 transition-all duration-300 hover:bg-blue-100/60 hover:text-blue-700 dark:bg-gray-700/60 dark:text-gray-200 dark:hover:bg-blue-900/30 dark:hover:text-blue-300"
			>
				<div
					class="mr-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600"
				>
					<FontAwesomeIcon icon={faUser} class="h-2.5 w-2.5 text-white" />
				</div>
				<span class="font-semibold">by {item.owner_username}</span>
				{#if item.owner_is_admin}
					<div
						class="ml-1.5 flex items-center gap-1 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm"
						title="Admin Verified"
					>
						<FontAwesomeIcon icon={faShieldAlt} class="h-2.5 w-2.5" />
						<span>Admin</span>
					</div>
				{/if}
			</button>
		</div>

		<!-- Posted Date -->
		{#if item.created_at}
			<p class="mb-3 text-xs text-gray-500 dark:text-gray-500">
				Posted {getDaysAgo(item.created_at)}
			</p>
		{/if}

		<!-- Price Section -->
		<div class="mb-3">
			{#if item.price_reduced && item.original_price && !item.is_free}
				<div class="mb-1 text-sm font-medium text-gray-400 line-through dark:text-gray-500">
					${formatPrice(item.original_price)}
				</div>
			{/if}
			<div class="flex items-baseline gap-2">
				{#if item.is_free}
					<span class="text-2xl font-bold text-green-600 dark:text-green-400">Free</span>
					<span
						class="inline-flex shrink-0 items-center gap-1 rounded-full bg-green-500 px-2 py-0.5 text-xs font-semibold text-white"
						title="This item is free"
					>
						<FontAwesomeIcon icon={faTag} class="h-2.5 w-2.5" />
						Free
					</span>
				{:else}
					<span class="text-2xl font-bold text-gray-900 dark:text-white">
						${formatPrice(item.price)}
					</span>
					{#if item.price_reduced && item.price_reduction_percentage}
						<span
							class="inline-flex shrink-0 items-center gap-1 rounded-full bg-red-500 px-2 py-0.5 text-xs font-semibold text-white"
							title="Save ${formatPrice(item.price_reduction_amount || 0)}"
						>
							<FontAwesomeIcon icon={faTag} class="h-2.5 w-2.5" />
							-{item.price_reduction_percentage.toFixed(0)}%
						</span>
					{/if}
				{/if}
			</div>
		</div>

		<!-- Savings Info (if price reduced) -->
		{#if item.price_reduced && item.price_reduction_amount && item.price_reduction_percentage}
			<p class="mb-3 text-xs font-medium text-red-600 dark:text-red-400">
				Save ${formatPrice(item.price_reduction_amount)} ({item.price_reduction_percentage.toFixed(
					0
				)}% off)
			</p>
		{/if}

		<!-- Condition and Quantity -->
		<div class="mb-3 flex flex-wrap items-center gap-2">
			{#if item.condition}
				<span
					class="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 ring-1 ring-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:ring-blue-800/50"
					title="Item condition"
				>
					<FontAwesomeIcon icon={faTag} class="h-3 w-3" />
					{item.condition}
				</span>
			{/if}
			{#if item.quantity !== null && item.quantity !== undefined}
				<span
					class="inline-flex items-center gap-1.5 rounded-full bg-purple-50 px-2.5 py-1 text-xs font-medium text-purple-700 ring-1 ring-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:ring-purple-800/50"
					title="Available quantity"
				>
					{item.quantity} {item.quantity === 1 ? 'item' : 'items'} available
				</span>
			{/if}
		</div>

		<!-- Badges Row -->
		<div class="flex flex-wrap items-center gap-2">
			{#if item.accepts_best_offer}
				<span
					class="inline-flex items-center gap-1.5 rounded-full bg-purple-50 px-2.5 py-1 text-xs font-medium text-purple-700 ring-1 ring-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:ring-purple-800/50"
					title="Accepts best offer"
				>
					<FontAwesomeIcon icon={faHandshake} class="h-3 w-3" />
					Best Offer
				</span>
			{/if}
			{#if item.contact_phone}
				<a
					href={`tel:${item.contact_phone}`}
					onclick={(e) => e.stopPropagation()}
					class="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700 ring-1 ring-green-200 transition hover:bg-green-100 dark:bg-green-900/30 dark:text-green-300 dark:ring-green-800/50 dark:hover:bg-green-900/50"
					title={`Call ${formatPhone(item.contact_phone)}`}
				>
					<FontAwesomeIcon icon={faPhone} class="h-3 w-3" />
					Call
				</a>
			{/if}
			{#if item.contact_email}
				<a
					href={`mailto:${item.contact_email}`}
					onclick={(e) => e.stopPropagation()}
					class="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 ring-1 ring-blue-200 transition hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:ring-blue-800/50 dark:hover:bg-blue-900/50"
					title={`Email ${item.contact_email}`}
				>
					<FontAwesomeIcon icon={faEnvelope} class="h-3 w-3" />
					Email
				</a>
			{/if}
			{#if item.venmo_url}
				<span
					class="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 ring-1 ring-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:ring-blue-800/50"
				>
					<FontAwesomeIcon icon={faMoneyBillWave} class="h-3 w-3" />
					Venmo
				</span>
			{/if}
			{#if item.facebook_url}
				<span
					class="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 ring-1 ring-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:ring-blue-800/50"
				>
					<FontAwesomeIcon icon={faFacebook} class="h-3 w-3" />
					Facebook
				</span>
			{/if}
		</div>
	</div>
</div>

<script lang="ts">
	import { goto } from '$app/navigation';
	import type { MarketItem } from '$lib/api';
	import { getAuthenticatedImageUrl } from '$lib/api';
	import { FontAwesomeIcon } from '@fortawesome/svelte-fontawesome';
	import { faFacebook } from '@fortawesome/free-brands-svg-icons';
	import { faCommentDots, faEnvelope, faHandshake, faMoneyBillWave, faPhone, faTag } from '@fortawesome/free-solid-svg-icons';

	let { item }: { item: MarketItem } = $props();

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

	function openItem() {
		goto(`/market/${item.id}`);
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			openItem();
		}
	}
</script>

<div
	role="button"
	tabindex="0"
	onclick={openItem}
	onkeydown={handleKeydown}
	class="group cursor-pointer overflow-hidden rounded-3xl bg-white/80 shadow-[0_1px_0_rgba(255,255,255,0.6),0_20px_40px_rgba(0,0,0,0.06)] ring-1 ring-black/5 backdrop-blur-xl transition-all duration-300 ease-out outline-none hover:-translate-y-1 hover:shadow-[0_1px_0_rgba(255,255,255,0.7),0_30px_60px_rgba(0,0,0,0.1)] focus-visible:-translate-y-1 focus-visible:ring-2 focus-visible:ring-blue-500/70 active:scale-[0.99] dark:bg-gray-800/80 dark:ring-gray-700"
>
	<!-- Image Section -->
	<div class="relative overflow-hidden">
		{#if item.featured_image}
			<img
				src={getAuthenticatedImageUrl(item.featured_image)}
				alt={item.name}
				loading="lazy"
				class="aspect-[16/10] w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.05]"
			/>
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
			<div
				class="rounded-full px-3 py-1.5 text-xs font-semibold backdrop-blur-md {item.status === 'sold'
					? 'bg-red-600/90 text-white'
					: item.status === 'hidden'
						? 'bg-gray-600/90 text-white'
						: 'bg-green-600/90 text-white'}"
			>
				{item.status === 'sold' ? 'Sold' : item.status === 'hidden' ? 'Hidden' : 'Available'}
			</div>
		</div>

		<!-- Hover overlay CTA -->
		<div
			class="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
		>
			<div
				class="rounded-full bg-white/95 px-4 py-2 text-sm font-semibold text-gray-900 shadow-lg backdrop-blur"
			>
				View Details
			</div>
		</div>
	</div>

	<!-- Content Section -->
	<div class="p-4">
		<!-- Title and Description -->
		<h3 class="mb-1.5 line-clamp-1 text-lg font-semibold tracking-tight text-gray-900 dark:text-white">
			{item.name}
		</h3>
		{#if item.description}
			<p class="mb-2 line-clamp-2 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
				{item.description}
			</p>
		{/if}

		<!-- Posted Date -->
		{#if item.created_at}
			<p class="mb-3 text-xs text-gray-500 dark:text-gray-500">
				Posted {getDaysAgo(item.created_at)}
			</p>
		{/if}

		<!-- Price Section -->
		<div class="mb-3">
			{#if item.price_reduced && item.original_price}
				<div class="mb-1 text-sm font-medium text-gray-400 line-through dark:text-gray-500">
					${formatPrice(item.original_price)}
				</div>
			{/if}
			<div class="flex items-baseline gap-2">
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
			</div>
		</div>

		<!-- Savings Info (if price reduced) -->
		{#if item.price_reduced && item.price_reduction_amount && item.price_reduction_percentage}
			<p class="mb-3 text-xs font-medium text-red-600 dark:text-red-400">
				Save ${formatPrice(item.price_reduction_amount)} ({item.price_reduction_percentage.toFixed(0)}% off)
			</p>
		{/if}

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

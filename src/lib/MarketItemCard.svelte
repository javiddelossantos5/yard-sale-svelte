<script lang="ts">
	import { goto } from '$app/navigation';
	import type { MarketItem } from '$lib/api';
	import { getAuthenticatedImageUrl } from '$lib/api';
	import { FontAwesomeIcon } from '@fortawesome/svelte-fontawesome';
	import { faFacebook } from '@fortawesome/free-brands-svg-icons';
	import { faCommentDots, faMoneyBillWave } from '@fortawesome/free-solid-svg-icons';

	let { item }: { item: MarketItem } = $props();

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
	class="group cursor-pointer overflow-hidden rounded-3xl bg-white/80 p-3 shadow-[0_1px_0_rgba(255,255,255,0.6),0_30px_60px_rgba(0,0,0,0.08)] ring-0 backdrop-blur-xl transition-all duration-500 ease-out outline-none hover:-translate-y-1 hover:shadow-[0_1px_0_rgba(255,255,255,0.7),0_40px_80px_rgba(0,0,0,0.12)] focus-visible:-translate-y-1 focus-visible:ring-2 focus-visible:ring-blue-500/70 active:scale-[0.99] dark:bg-gray-800/80 dark:shadow-black/30"
>
	<div class="relative mb-3 overflow-hidden rounded-2xl">
		{#if item.featured_image}
			<img
				src={getAuthenticatedImageUrl(item.featured_image)}
				alt={item.name}
				loading="lazy"
				class="aspect-[16/10] w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
			/>
		{:else}
			<div
				class="aspect-[16/10] w-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600"
			></div>
		{/if}

		<div class="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-black/5"></div>

		<!-- Comment Count - Left side -->
		<div class="absolute top-3 left-3">
			<div
				class="rounded-full bg-black/60 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur-md"
			>
				<FontAwesomeIcon icon={faCommentDots} class="mr-1 h-3.5 w-3.5" />
				{item.comment_count}
			</div>
		</div>

		<!-- Status Badge - Right side -->
		<div class="absolute top-3 right-3">
			<div
				class="rounded-full px-2.5 py-1 text-xs font-semibold backdrop-blur-md {item.status === 'sold'
					? 'bg-red-600/90 text-white'
					: item.status === 'hidden'
						? 'bg-gray-600/90 text-white'
						: 'bg-green-600/90 text-white'}"
			>
				{item.status === 'sold' ? 'Sold' : item.status === 'hidden' ? 'Hidden' : 'Available'}
			</div>
		</div>

		<!-- hover overlay CTA -->
		<div
			class="pointer-events-none absolute inset-0 flex items-end justify-end bg-gradient-to-t from-black/30 via-black/0 to-black/0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
		>
			<div
				class="m-3 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-gray-900 shadow-sm backdrop-blur"
			>
				View item
			</div>
		</div>
	</div>

	<div class="px-1 pt-1 pb-2">
		<h3
			class="mb-1 line-clamp-2 text-base font-semibold tracking-tight text-gray-900 dark:text-white"
		>
			{item.name}
		</h3>
		<p class="line-clamp-2 text-sm text-gray-600 dark:text-gray-300">{item.description}</p>

		<div class="mt-3 flex items-center justify-between">
			<div
				class="inline-flex items-center rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 px-3 py-1.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-black/5 ring-inset dark:from-gray-700 dark:to-gray-600 dark:text-white dark:ring-white/10"
				aria-label={`Price ${item.price.toFixed(2)}`}
			>
				${item.price.toFixed(2)}
			</div>
			<div class="inline-flex items-center gap-2 text-xs text-gray-500 dark:text-gray-300">
				{#if item.venmo_url}
					<span
						class="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-1 text-[11px] font-semibold text-blue-600 ring-1 ring-blue-100 ring-inset dark:bg-blue-900/30 dark:text-blue-200 dark:ring-blue-800/60"
					>
						<FontAwesomeIcon icon={faMoneyBillWave} class="h-3.5 w-3.5" /> Venmo
					</span>
				{/if}
				{#if item.facebook_url}
					<span
						class="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-1 text-[11px] font-semibold text-blue-600 ring-1 ring-blue-100 ring-inset dark:bg-blue-900/30 dark:text-blue-200 dark:ring-blue-800/60"
					>
						<FontAwesomeIcon icon={faFacebook} class="h-3.5 w-3.5" /> Facebook
					</span>
				{/if}
			</div>
		</div>
	</div>
</div>

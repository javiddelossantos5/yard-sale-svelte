<script lang="ts">
	import { goto } from '$app/navigation';
	import type { MarketItem } from '$lib/api';
	import { FontAwesomeIcon } from '@fortawesome/svelte-fontawesome';

	let { item }: { item: MarketItem } = $props();

	function openItem() {
		goto(`/market/${item.id}`);
	}
</script>

<div
	role="button"
	tabindex="0"
	onclick={openItem}
	onkeydown={(e) => e.key === 'Enter' && openItem()}
	class="group cursor-pointer overflow-hidden rounded-3xl bg-white/80 p-3 shadow-[0_1px_0_rgba(255,255,255,0.6),0_30px_60px_rgba(0,0,0,0.08)] backdrop-blur-xl transition-all duration-500 ease-out hover:-translate-y-1 hover:shadow-[0_1px_0_rgba(255,255,255,0.7),0_40px_80px_rgba(0,0,0,0.12)] active:scale-[0.99] dark:bg-gray-800/80 dark:shadow-black/30"
>
	{#if item.featured_image}
		<div class="relative mb-3 overflow-hidden rounded-2xl">
			<img
				src={item.featured_image}
				alt={item.name}
				class="h-48 w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
			/>
			<div class="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-black/5"></div>
			<div
				class="absolute top-3 right-3 rounded-full bg-black/60 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur-md"
			>
				{item.comment_count}
				{item.comment_count === 1 ? 'comment' : 'comments'}
			</div>
		</div>
	{/if}

	<div class="px-1 pt-1 pb-2">
		<h3
			class="mb-1 line-clamp-2 text-base font-semibold tracking-tight text-gray-900 dark:text-white"
		>
			{item.name}
		</h3>
		<p class="line-clamp-2 text-sm text-gray-600 dark:text-gray-300">{item.description}</p>

		<div class="mt-3 flex items-center justify-between">
			<div
				class="inline-flex items-center rounded-2xl bg-gray-100 px-3 py-1.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-black/5 ring-inset dark:bg-gray-700 dark:text-white dark:ring-white/10"
			>
				${item.price.toFixed(2)}
			</div>
			<div class="inline-flex items-center gap-2 text-xs text-gray-500 dark:text-gray-300">
				{#if item.venmo_url}
					<span
						class="rounded-full bg-blue-50 px-2 py-1 text-[11px] font-semibold text-blue-600 ring-1 ring-blue-100 ring-inset dark:bg-blue-900/30 dark:text-blue-200 dark:ring-blue-800/60"
						>Venmo</span
					>
				{/if}
				{#if item.facebook_url}
					<span
						class="rounded-full bg-blue-50 px-2 py-1 text-[11px] font-semibold text-blue-600 ring-1 ring-blue-100 ring-inset dark:bg-blue-900/30 dark:text-blue-200 dark:ring-blue-800/60"
						>Facebook</span
					>
				{/if}
			</div>
		</div>
	</div>
</div>


<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import {
		getMarketItemById,
		getMarketItemComments,
		addMarketItemComment,
		deleteMarketItemComment,
		watchMarketItem,
		unwatchMarketItem,
		getAuthenticatedImageUrl,
		getCurrentUser,
		type MarketItem,
		type MarketItemComment,
		type CurrentUser
	} from '$lib/api';
	import { FontAwesomeIcon } from '@fortawesome/svelte-fontawesome';
	import { faFacebook } from '@fortawesome/free-brands-svg-icons';
	import {
		faChevronLeft,
		faHeart,
		faMoneyBillWave,
		faPaperPlane,
		faUser
	} from '@fortawesome/free-solid-svg-icons';

	let item = $state<MarketItem | null>(null);
	let comments = $state<MarketItemComment[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let newComment = $state('');
	let isWatched = $state(false);
	let currentUser = $state<CurrentUser | null>(null);

	function formatDateTime(iso: string): string {
		try {
			const d = new Date(iso);
			return new Intl.DateTimeFormat(undefined, {
				year: 'numeric',
				month: 'short',
				day: '2-digit',
				hour: 'numeric',
				minute: '2-digit'
			}).format(d);
		} catch {
			return iso;
		}
	}

	async function load() {
		loading = true;
		error = null;
		try {
			const id = $page.params.id || '';
			getCurrentUser()
				.then((u) => (currentUser = u))
				.catch(() => (currentUser = null));
			item = await getMarketItemById(id);
			comments = await getMarketItemComments(id);
		} catch (e: any) {
			error = e?.message || 'Failed to load item';
		} finally {
			loading = false;
		}
	}

	$effect(() => {
		load();
	});

	async function submitComment(e: Event) {
		e.preventDefault();
		if (!item || !newComment.trim()) return;
		const created = await addMarketItemComment(item.id, newComment.trim());
		comments = [created, ...comments];
		newComment = '';
	}

	async function handleDeleteComment(commentId: string) {
		await deleteMarketItemComment(commentId);
		comments = comments.filter((c) => c.id !== commentId);
	}

	async function toggleWatch() {
		if (!item) return;
		if (isWatched) {
			await unwatchMarketItem(item.id);
			isWatched = false;
		} else {
			await watchMarketItem(item.id);
			isWatched = true;
		}
	}
</script>

<div class="min-h-screen bg-gray-50 dark:bg-gray-900">
	{#if loading}
		<div class="px-4 py-6 text-gray-600 dark:text-gray-300">Loading item...</div>
	{:else if error}
		<div class="px-4 py-6 text-red-600">{error}</div>
	{:else if item}
		<div
			class="sticky top-0 z-10 border-b bg-white/80 backdrop-blur-md dark:border-gray-700 dark:bg-gray-800/80"
		>
			<div class="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
				<button
					onclick={() => history.back()}
					class="inline-flex items-center rounded-xl bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
				>
					<FontAwesomeIcon icon={faChevronLeft} class="mr-2 h-4 w-4" /> Back
				</button>
				<div class="text-sm font-medium text-gray-500 dark:text-gray-300">Marketplace</div>
				<div class="w-20"></div>
			</div>
		</div>

		<div class="mx-auto max-w-5xl px-4 pt-6">
			<div
				class="overflow-hidden rounded-3xl shadow-[0_1px_0_rgba(255,255,255,0.6),0_30px_60px_rgba(0,0,0,0.08)] ring-1 ring-black/5 dark:shadow-black/30"
			>
				<div class="relative">
					{#if item.featured_image}
						<img
							src={getAuthenticatedImageUrl(item.featured_image)}
							alt={item.name}
							class="aspect-[16/10] w-full object-cover"
							loading="lazy"
						/>
					{:else}
						<div
							class="aspect-[16/10] w-full bg-linear-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600"
						></div>
					{/if}
					<div
						class="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/30 via-black/0 to-black/0"
					></div>
				</div>
				<!-- Info card below the image (keeps price outside of the image area) -->
				<div class="mx-auto mt-4 max-w-[calc(100%-2rem)] px-4 sm:px-6">
					<div
						class="rounded-2xl bg-white/90 p-4 shadow-lg ring-1 ring-black/5 backdrop-blur-md dark:bg-gray-800/90 dark:ring-gray-700"
					>
						<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
							<div>
								<h1 class="text-xl font-semibold text-gray-900 sm:text-2xl dark:text-white">
									{item.name}
								</h1>
								<p class="mt-1 text-sm text-gray-600 dark:text-gray-300">{item.description}</p>
							</div>
							<div class="flex items-center gap-3">
								<div
									class="inline-flex items-center rounded-2xl bg-linear-to-br from-gray-100 to-gray-200 px-3 py-1.5 text-sm font-semibold text-gray-900 ring-1 ring-black/5 ring-inset dark:from-gray-700 dark:to-gray-600 dark:text-white dark:ring-white/10"
								>
									${item.price.toFixed(2)}
								</div>
								<button
									onclick={toggleWatch}
									class="inline-flex items-center rounded-xl bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-gray-200 transition hover:bg-gray-50 active:scale-95 dark:bg-gray-700 dark:text-gray-200 dark:ring-gray-600"
								>
									<FontAwesomeIcon icon={faHeart} class="mr-2 h-4 w-4" />
									{isWatched ? 'Unwatch' : 'Watch'}
								</button>
								{#if item.venmo_url}
									<a
										href={item.venmo_url}
										target="_blank"
										rel="noopener noreferrer"
										onclick={(e) => e.stopPropagation()}
										class="inline-flex items-center rounded-xl bg-blue-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 active:scale-95"
									>
										<FontAwesomeIcon icon={faMoneyBillWave} class="mr-2 h-4 w-4" /> Venmo
									</a>
								{/if}
								{#if item.facebook_url}
									<a
										href={item.facebook_url}
										target="_blank"
										rel="noopener noreferrer"
										onclick={(e) => e.stopPropagation()}
										class="inline-flex items-center rounded-xl bg-blue-700 px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-800 active:scale-95"
									>
										<FontAwesomeIcon icon={faFacebook} class="mr-2 h-4 w-4" /> Facebook
									</a>
								{/if}
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>

		<div class="mx-auto max-w-5xl px-4 pt-12 pb-12">
			<h2 class="mb-3 text-lg font-semibold text-gray-900 dark:text-white">
				Comments ({comments.length})
			</h2>
			<form onsubmit={submitComment} class="mb-5 flex gap-2">
				<input
					class="flex-1 rounded-xl border-0 bg-white px-4 py-3 text-gray-900 shadow-sm ring-1 ring-gray-300 ring-inset placeholder:text-gray-500 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-gray-800 dark:text-white dark:ring-gray-600"
					placeholder="Write a comment..."
					bind:value={newComment}
				/>
				<button
					class="inline-flex items-center rounded-xl bg-indigo-600 px-4 py-2 font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:outline-none active:scale-95"
				>
					<FontAwesomeIcon icon={faPaperPlane} class="mr-2 h-4 w-4" /> Post
				</button>
			</form>

			<div class="space-y-4">
				{#each comments as c}
					{@const isMine = currentUser && c.user_id === currentUser.id}
					<div class={isMine ? 'flex justify-end' : 'flex justify-start'}>
						<div
							class={(isMine
								? 'bg-indigo-600 text-white ring-indigo-500/20'
								: 'bg-white/90 text-gray-900 ring-black/5 dark:bg-gray-800/90 dark:text-gray-100 dark:ring-gray-700') +
								' max-w-[85%] rounded-3xl p-4 shadow-[0_1px_0_rgba(255,255,255,0.5),0_20px_40px_rgba(0,0,0,0.06)] ring-1 backdrop-blur-lg'}
						>
							<div class="flex items-center justify-between">
								<div class="text-[15px] font-semibold">
									{isMine ? 'You' : (c.username ?? 'Anonymous')}
								</div>
								<div
									class={isMine
										? 'rounded-full bg-white/20 px-2 py-0.5 text-[11px]'
										: 'rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-600 ring-1 ring-gray-200 ring-inset dark:bg-gray-700/70 dark:text-gray-300 dark:ring-gray-600'}
								>
									{formatDateTime(c.created_at)}
								</div>
							</div>
							<div
								class={(isMine
									? 'bg-white/10 text-white ring-white/20'
									: 'bg-gray-50 text-gray-800 ring-gray-200 dark:bg-gray-700/60 dark:text-gray-100 dark:ring-gray-600') +
									' mt-2 rounded-2xl px-4 py-3 text-[15px] leading-relaxed ring-1 ring-inset'}
							>
								{c.content}
							</div>
							<div class={'mt-2 flex ' + (isMine ? 'justify-start' : 'justify-end')}>
								<button
									onclick={() => handleDeleteComment(c.id)}
									class={isMine
										? 'rounded-full px-2 py-1 text-xs font-medium text-white/80 hover:bg-white/10'
										: 'rounded-full px-2 py-1 text-xs font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'}
									>Delete</button
								>
							</div>
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}
</div>

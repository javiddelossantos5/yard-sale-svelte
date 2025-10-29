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
        type MarketItem,
        type MarketItemComment
    } from '$lib/api';
    import { FontAwesomeIcon } from '@fortawesome/svelte-fontawesome';
    import { faFacebook } from '@fortawesome/free-brands-svg-icons';

    let item = $state<MarketItem | null>(null);
    let comments = $state<MarketItemComment[]>([]);
    let loading = $state(true);
    let error = $state<string | null>(null);
    let newComment = $state('');
    let isWatched = $state(false);

    async function load() {
        loading = true;
        error = null;
        try {
            const id = $page.params.id || '';
            item = await getMarketItemById(id);
            comments = await getMarketItemComments(id);
        } catch (e: any) {
            error = e?.message || 'Failed to load item';
        } finally {
            loading = false;
        }
    }

    $effect(() => { load(); });

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

<div class="p-6">
    {#if loading}
        <div class="text-gray-600 dark:text-gray-300">Loading item...</div>
    {:else if error}
        <div class="text-red-600">{error}</div>
    {:else if item}
        <div class="mx-auto max-w-4xl rounded-2xl bg-white p-6 shadow-sm dark:bg-gray-800">
            <h1 class="mb-2 text-2xl font-bold text-gray-900 dark:text-white">{item.name}</h1>
            <div class="mb-4 text-gray-700 dark:text-gray-200">${item.price.toFixed(2)}</div>

            {#if item.featured_image}
                <img src={item.featured_image} alt={item.name} class="mb-4 h-80 w-full rounded-xl object-cover" />
            {/if}

            <p class="mb-6 text-gray-700 dark:text-gray-200">{item.description}</p>

            <div class="mb-6 flex flex-wrap gap-3">
                <button onclick={toggleWatch} class="inline-flex items-center rounded-full border px-4 py-2 text-sm font-medium transition-all active:scale-95 dark:border-gray-600">
                    {#if isWatched}
                        <span>Unwatch</span>
                    {:else}
                        <span>Watch</span>
                    {/if}
                </button>

                {#if item.venmo_url}
                    <a href={item.venmo_url} target="_blank" rel="noopener noreferrer" class="inline-flex items-center rounded-full bg-blue-500 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-blue-600">
                        <FontAwesomeIcon icon="check-circle" class="mr-2 h-4 w-4" />
                        Venmo
                    </a>
                {/if}

                {#if item.facebook_url}
                    <a href={item.facebook_url} target="_blank" rel="noopener noreferrer" class="inline-flex items-center rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-blue-700">
                        <FontAwesomeIcon icon={faFacebook} class="mr-2 h-4 w-4" />
                        Facebook
                    </a>
                {/if}
            </div>

            <h2 class="mb-3 text-lg font-semibold text-gray-900 dark:text-white">Comments ({comments.length})</h2>
            <form onsubmit={submitComment} class="mb-4 flex gap-2">
                <input class="flex-1 rounded-xl border px-3 py-2 dark:bg-gray-700 dark:text-white dark:border-gray-600" placeholder="Write a comment..." bind:value={newComment} />
                <button class="rounded-xl bg-indigo-600 px-4 py-2 text-white transition hover:bg-indigo-700">Post</button>
            </form>

            <div class="space-y-3">
                {#each comments as c}
                    <div class="rounded-xl bg-gray-100 p-3 dark:bg-gray-700">
                        <div class="text-sm text-gray-800 dark:text-gray-100">{c.content}</div>
                        <div class="mt-1 flex items-center justify-between text-xs text-gray-500 dark:text-gray-300">
                            <span>{new Date(c.created_at).toLocaleString()}</span>
                            <button onclick={() => handleDeleteComment(c.id)} class="text-red-500 hover:underline">Delete</button>
                        </div>
                    </div>
                {/each}
            </div>
        </div>
    {/if}
</div>




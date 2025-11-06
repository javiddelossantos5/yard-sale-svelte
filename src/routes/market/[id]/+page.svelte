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
		updateMarketItem,
		deleteMarketItem,
		getAuthenticatedImageUrl,
		getCurrentUser,
		getMarketItemConversations,
		isAdmin,
		type MarketItem,
		type MarketItemComment,
		type CurrentUser,
		type MarketItemConversation
	} from '$lib/api';
	import { goto } from '$app/navigation';
	import { FontAwesomeIcon } from '@fortawesome/svelte-fontawesome';
	import { faFacebook } from '@fortawesome/free-brands-svg-icons';
	import {
		faChevronLeft,
		faChevronRight,
		faEnvelope,
		faHandshake,
		faHeart,
		faMoneyBillWave,
		faPhone,
		faPencil,
		faTag,
		faMessage,
		faPaperPlane,
		faUser,
		faTrash,
		faStar,
		faBars,
		faHome,
		faStore,
		faArrowRightFromBracket,
		faArrowRight,
		faCheckCircle,
		faShieldAlt
	} from '@fortawesome/free-solid-svg-icons';
	import EditMarketItemModal from '$lib/EditMarketItemModal.svelte';
	import MarketItemMessageModal from '$lib/MarketItemMessageModal.svelte';
	import MarketItemFeaturedImageModal from '$lib/MarketItemFeaturedImageModal.svelte';
	import ConfirmationModal from '$lib/ConfirmationModal.svelte';
	import DeleteConfirmationModal from '$lib/DeleteConfirmationModal.svelte';
	import { logout } from '$lib/auth';
	import { unreadMessageCount } from '$lib/notifications';

	let mobileMenuOpen = $state(false);
	let item = $state<MarketItem | null>(null);
	let comments = $state<MarketItemComment[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let newComment = $state('');
	let isWatched = $state(false);
	let currentUser = $state<CurrentUser | null>(null);
	let isEditOpen = $state(false);
	let isMessageOpen = $state(false);
	let showFeaturedImageModal = $state(false);
	let existingConversation = $state<MarketItemConversation | null>(null);
	let checkingConversation = $state(false);
	let submittingComment = $state(false);
	let markingAsSold = $state(false);
	let showMarkAsSoldModal = $state(false);
	let showDeleteModal = $state(false);
	let deleting = $state(false);

	// Image carousel state
	let currentImageIndex = $state(0);
	let touchStartX = $state(0);
	let touchEndX = $state(0);
	let showAllImages = $state(false);

	// Full-screen image viewer state
	let imageViewerOpen = $state(false);
	let viewerImageIndex = $state(0);

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

	function formatDate(iso: string): string {
		try {
			const d = new Date(iso);
			return new Intl.DateTimeFormat(undefined, {
				year: 'numeric',
				month: 'short',
				day: 'numeric'
			}).format(d);
		} catch {
			return iso;
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

	async function load() {
		loading = true;
		error = null;
		try {
			const id = $page.params.id || '';
			const [user, loadedItem] = await Promise.all([
				getCurrentUser().catch(() => null),
				getMarketItemById(id)
			]);
			currentUser = user;
			item = loadedItem;

			if (item?.is_watched !== undefined && item?.is_watched !== null) {
				isWatched = item.is_watched === true;
			}

			// Load comments
			if (id) {
				comments = await getMarketItemComments(id);
			}

			// Check for existing conversation if user is logged in and not the owner
			if (user && item && user.id !== item.owner_id) {
				await checkExistingConversation(id);
			}
		} catch (e: any) {
			error = e?.message || 'Failed to load item';
		} finally {
			loading = false;
		}
	}

	async function checkExistingConversation(itemId: string) {
		if (!currentUser) return;
		checkingConversation = true;
		try {
			const conversations = await getMarketItemConversations();
			const conv = conversations.find((c) => c.item_id === itemId);
			existingConversation = conv || null;
		} catch {
			// Ignore errors checking conversation
		} finally {
			checkingConversation = false;
		}
	}

	async function handleMessageSuccess() {
		// Refresh conversation check after sending message
		if (item) {
			await checkExistingConversation(item.id);
		}
	}

	$effect(() => {
		load();
	});

	function getRelativeTime(dateString: string): string {
		try {
			const date = new Date(dateString);
			const now = new Date();
			const diffMs = now.getTime() - date.getTime();
			const diffSecs = Math.floor(diffMs / 1000);
			const diffMins = Math.floor(diffSecs / 60);
			const diffHours = Math.floor(diffMins / 60);
			const diffDays = Math.floor(diffHours / 24);

			if (diffSecs < 60) return 'just now';
			if (diffMins < 60) return `${diffMins}m ago`;
			if (diffHours < 24) return `${diffHours}h ago`;
			if (diffDays < 7) return `${diffDays}d ago`;
			return formatDateTime(dateString);
		} catch {
			return dateString;
		}
	}

	async function submitComment(e: Event) {
		e.preventDefault();
		if (!item || !newComment.trim() || submittingComment) return;
		submittingComment = true;
		try {
			const created = await addMarketItemComment(item.id, newComment.trim());
			comments = [created, ...comments];
			newComment = '';
		} catch (e: any) {
			error = e?.message || 'Failed to post comment';
		} finally {
			submittingComment = false;
		}
	}

	async function handleDeleteComment(commentId: string) {
		try {
			await deleteMarketItemComment(commentId);
			comments = comments.filter((c) => c.id !== commentId);
		} catch (e: any) {
			error = e?.message || 'Failed to delete comment';
		}
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

	async function handleEditSuccess() {
		await load(); // Reload the item after editing
	}

	function openMarkAsSoldModal() {
		showMarkAsSoldModal = true;
	}

	function closeMarkAsSoldModal() {
		showMarkAsSoldModal = false;
	}

	async function markAsSold() {
		if (!item || markingAsSold) return;

		markingAsSold = true;
		error = null;
		showMarkAsSoldModal = false;
		try {
			await updateMarketItem(item.id, { status: 'sold' });
			await load(); // Reload the item to show updated status
		} catch (e: any) {
			error = e?.message || 'Failed to mark item as sold';
		} finally {
			markingAsSold = false;
		}
	}

	function handleSetFeaturedImage() {
		if (currentUser && item && (currentUser.id === item.owner_id || isAdmin(currentUser))) {
			showFeaturedImageModal = true;
		}
	}

	function handleCloseFeaturedImageModal() {
		showFeaturedImageModal = false;
	}

	async function handleFeaturedImageSuccess() {
		showFeaturedImageModal = false;
		await load(); // Reload the item after setting featured image
	}

	function handleDeleteItem() {
		if (currentUser && item && (currentUser.id === item.owner_id || isAdmin(currentUser))) {
			showDeleteModal = true;
		}
	}

	function handleCloseDeleteModal() {
		showDeleteModal = false;
	}

	async function handleConfirmDelete() {
		if (!item || deleting) return;

		deleting = true;
		error = null;
		showDeleteModal = false;
		try {
			await deleteMarketItem(item.id);
			// Redirect to marketplace after successful deletion
			goto('/market');
		} catch (e: any) {
			error = e?.message || 'Failed to delete market item';
			// Keep the modal open so user can try again or cancel
			showDeleteModal = true;
		} finally {
			deleting = false;
		}
	}

	// Image carousel functions
	function getDisplayPhotos() {
		if (!item || !item.photos || item.photos.length === 0) return [];

		const photos = item.photos;
		const featuredImage = item.featured_image;
		if (featuredImage && photos.includes(featuredImage)) {
			// Featured image first, then rest
			return [featuredImage, ...photos.filter((p) => p !== featuredImage)];
		}
		return photos;
	}

	function nextImage() {
		const photos = getDisplayPhotos();
		if (photos.length > 0) {
			currentImageIndex = (currentImageIndex + 1) % photos.length;
		}
	}

	function previousImage() {
		const photos = getDisplayPhotos();
		if (photos.length > 0) {
			currentImageIndex = currentImageIndex === 0 ? photos.length - 1 : currentImageIndex - 1;
		}
	}

	function goToImage(index: number) {
		const photos = getDisplayPhotos();
		if (index >= 0 && index < photos.length) {
			currentImageIndex = index;
		}
	}

	// Touch/swipe handlers
	function handleTouchStart(e: TouchEvent) {
		touchStartX = e.touches[0].clientX;
	}

	function handleTouchMove(e: TouchEvent) {
		touchEndX = e.touches[0].clientX;
	}

	function handleTouchEnd() {
		if (!touchStartX || !touchEndX) return;

		const distance = touchStartX - touchEndX;
		const minSwipeDistance = 50;

		if (Math.abs(distance) > minSwipeDistance) {
			if (distance > 0) {
				// Swipe left - next image
				nextImage();
			} else {
				// Swipe right - previous image
				previousImage();
			}
		}

		// Reset
		touchStartX = 0;
		touchEndX = 0;
	}

	// Reset carousel when item changes
	$effect(() => {
		if (item) {
			currentImageIndex = 0;
		}
	});

	// Full-screen image viewer functions
	function openImageViewer(index: number) {
		viewerImageIndex = index;
		imageViewerOpen = true;
	}

	function closeImageViewer() {
		imageViewerOpen = false;
	}

	function nextViewerImage() {
		const photos = getDisplayPhotos();
		if (photos.length > 0) {
			viewerImageIndex = (viewerImageIndex + 1) % photos.length;
		}
	}

	function previousViewerImage() {
		const photos = getDisplayPhotos();
		if (photos.length > 0) {
			viewerImageIndex = viewerImageIndex === 0 ? photos.length - 1 : viewerImageIndex - 1;
		}
	}

	// Keyboard navigation for image viewer
	function handleKeyDown(e: KeyboardEvent) {
		if (!imageViewerOpen) return;

		if (e.key === 'ArrowLeft') {
			previousViewerImage();
		} else if (e.key === 'ArrowRight') {
			nextViewerImage();
		} else if (e.key === 'Escape') {
			closeImageViewer();
		}
	}

	// Add keyboard listener when viewer is open
	$effect(() => {
		if (imageViewerOpen) {
			window.addEventListener('keydown', handleKeyDown);
			// Prevent body scroll when modal is open
			document.body.style.overflow = 'hidden';
		} else {
			document.body.style.overflow = '';
		}

		return () => {
			window.removeEventListener('keydown', handleKeyDown);
			document.body.style.overflow = '';
		};
	});

	const isOwner = $derived(currentUser && item && currentUser.id === item.owner_id);
	const canEdit = $derived(isOwner || (currentUser && isAdmin(currentUser)));

	function viewConversation() {
		if (existingConversation) {
			goto(`/market/messages/${existingConversation.id}`);
		}
	}

	function goToProfile() {
		if (currentUser) goto(`/profile/${currentUser.id}`);
	}

	function handleLogout() {
		logout();
		goto('/login');
	}
</script>

<svelte:head>
	<title>{item ? `${item.name} - Marketplace` : 'Marketplace Item'}</title>
	<meta name="description" content={item?.description || 'View marketplace item details'} />
	<style>
		:global(html, body) {
			background-color: rgb(249 250 251); /* bg-gray-50 */
		}
		:global(.dark html, .dark body) {
			background-color: rgb(17 24 39); /* bg-gray-900 */
		}
	</style>
</svelte:head>

<div class="min-h-screen bg-gray-50 dark:bg-gray-900" style="min-height: 100vh;">
	{#if loading}
		<div class="px-4 py-6 text-gray-600 dark:text-gray-300">Loading item...</div>
	{:else if error}
		<div class="px-4 py-6 text-red-600">{error}</div>
	{:else if item}
		<!-- Header -->
		<header
			class="sticky top-0 z-50 border-b border-gray-200/80 bg-white/80 backdrop-blur-xl dark:border-gray-800/80 dark:bg-gray-900/80"
		>
			<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
				<!-- Mobile Layout -->
				<div class="block sm:hidden">
					<div class="flex h-16 items-center justify-between">
						<!-- Logo and Title -->
						<div class="flex min-w-0 flex-1 items-center space-x-3">
							<button
								onclick={() => goto('/market')}
								class="shrink-0 rounded-full p-1.5 transition hover:bg-gray-100 dark:hover:bg-gray-700"
								aria-label="Back to marketplace"
							>
								<FontAwesomeIcon icon={faChevronLeft} class="h-5 w-5" />
							</button>
							<img
								src="/icon2.png"
								alt="Yard Sale Finder Logo"
								class="h-8 w-8 shrink-0 rounded-lg object-cover"
							/>
							<div class="min-w-0 flex-1">
								<h1 class="truncate text-lg font-semibold text-gray-900 dark:text-white">
									{item.name}
								</h1>
								<p class="text-xs text-gray-500 dark:text-gray-400">Marketplace item</p>
							</div>
						</div>

						<!-- Right side: Menu button -->
						<div class="flex items-center gap-2">
							<button
								onclick={() => (mobileMenuOpen = !mobileMenuOpen)}
								class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 transition-all duration-200 hover:bg-gray-200 active:scale-95 dark:bg-gray-800 dark:hover:bg-gray-700"
								aria-label="Menu"
							>
								<FontAwesomeIcon icon={faBars} class="h-5 w-5 text-gray-700 dark:text-gray-300" />
							</button>
						</div>
					</div>

					<!-- Mobile Menu Dropdown -->
					{#if mobileMenuOpen}
						<div class="border-t border-gray-200 pt-4 pb-4 dark:border-gray-800">
							<div class="space-y-1">
								<button
									onclick={() => {
										goto('/');
										mobileMenuOpen = false;
									}}
									class="flex w-full items-center rounded-xl px-4 py-3 text-left text-base font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
								>
									<FontAwesomeIcon
										icon={faHome}
										class="mr-3 h-5 w-5 text-gray-500 dark:text-gray-400"
									/>
									Home
								</button>
								<button
									onclick={() => {
										goto('/market');
										mobileMenuOpen = false;
									}}
									class="flex w-full items-center rounded-xl px-4 py-3 text-left text-base font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
								>
									<FontAwesomeIcon
										icon={faStore}
										class="mr-3 h-5 w-5 text-gray-500 dark:text-gray-400"
									/>
									Marketplace
								</button>
								{#if currentUser}
									<button
										onclick={() => {
											goto('/market/watched');
											mobileMenuOpen = false;
										}}
										class="flex w-full items-center rounded-xl px-4 py-3 text-left text-base font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
									>
										<FontAwesomeIcon
											icon={faHeart}
											class="mr-3 h-5 w-5 text-gray-500 dark:text-gray-400"
										/>
										Watched Items
									</button>
									<button
										onclick={() => {
											goto('/messages?tab=market');
											mobileMenuOpen = false;
										}}
										class="flex w-full items-center rounded-xl px-4 py-3 text-left text-base font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
									>
										<FontAwesomeIcon
											icon={faMessage}
											class="mr-3 h-5 w-5 text-gray-500 dark:text-gray-400"
										/>
										Messages
									</button>
									<button
										onclick={() => {
											goToProfile();
											mobileMenuOpen = false;
										}}
										class="relative flex w-full items-center rounded-xl px-4 py-3 text-left text-base font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
									>
										<FontAwesomeIcon
											icon={faUser}
											class="mr-3 h-5 w-5 text-gray-500 dark:text-gray-400"
										/>
										My Profile
										{#if $unreadMessageCount > 0}
											<span
												class="ml-auto rounded-full bg-red-500 px-2.5 py-0.5 text-sm font-semibold text-white"
											>
												{$unreadMessageCount > 99 ? '99+' : $unreadMessageCount}
											</span>
										{/if}
									</button>
								{/if}
								<button
									onclick={() => {
										handleLogout();
										mobileMenuOpen = false;
									}}
									class="flex w-full items-center rounded-xl px-4 py-3 text-left text-base font-medium text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
								>
									<FontAwesomeIcon icon={faArrowRightFromBracket} class="mr-3 h-5 w-5" />
									Logout
								</button>
							</div>
						</div>
					{/if}
				</div>

				<!-- Desktop Layout -->
				<div class="hidden sm:block">
					<div class="flex h-20 items-center justify-between">
						<!-- Left: Logo and Title -->
						<div class="flex min-w-0 flex-1 items-center space-x-4">
							<button
								onclick={() => goto('/market')}
								class="shrink-0 rounded-full p-2 transition hover:bg-gray-100 dark:hover:bg-gray-700"
								aria-label="Back to marketplace"
							>
								<FontAwesomeIcon icon={faChevronLeft} class="h-5 w-5" />
							</button>
							<button
								onclick={() => goto('/')}
								class="shrink-0 rounded-xl transition-opacity hover:opacity-80 active:scale-95"
								aria-label="Go to home"
							>
								<img
									src="/icon2.png"
									alt="Yard Sale Finder Logo"
									class="h-12 w-12 rounded-xl object-cover shadow-sm"
								/>
							</button>
							<div class="min-w-0 flex-1">
								<h1 class="truncate text-2xl font-bold text-gray-900 dark:text-white">
									{item.name}
								</h1>
								<div class="mt-0.5 flex items-center gap-3">
									<p class="text-sm text-gray-600 dark:text-gray-400">Marketplace item</p>
								</div>
							</div>
						</div>

						<!-- Right: Actions -->
						<div class="flex shrink-0 items-center gap-3">
							<!-- Secondary Actions -->
							<div class="flex items-center gap-2">
								<button
									onclick={() => goto('/')}
									class="flex items-center rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-semibold text-gray-700 transition-all duration-200 hover:bg-gray-200 active:scale-95 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
								>
									<FontAwesomeIcon icon={faHome} class="mr-2 h-4 w-4" />
									Home
								</button>
								<button
									onclick={() => goto('/market')}
									class="flex items-center rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-semibold text-gray-700 transition-all duration-200 hover:bg-gray-200 active:scale-95 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
								>
									<FontAwesomeIcon icon={faStore} class="mr-2 h-4 w-4" />
									Marketplace
								</button>
								{#if currentUser}
									<button
										onclick={() => goto('/market/watched')}
										class="flex items-center rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-semibold text-gray-700 transition-all duration-200 hover:bg-gray-200 active:scale-95 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
									>
										<FontAwesomeIcon icon={faHeart} class="mr-2 h-4 w-4" />
										Watched
									</button>
									<button
										onclick={() => goto('/messages?tab=market')}
										class="flex items-center rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-semibold text-gray-700 transition-all duration-200 hover:bg-gray-200 active:scale-95 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
									>
										<FontAwesomeIcon icon={faMessage} class="mr-2 h-4 w-4" />
										Messages
									</button>
									<button
										onclick={goToProfile}
										class="relative flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 transition-all duration-200 hover:bg-gray-200 active:scale-95 dark:bg-gray-800 dark:hover:bg-gray-700"
										aria-label="My Profile"
									>
										<FontAwesomeIcon
											icon={faUser}
											class="h-5 w-5 text-gray-700 dark:text-gray-200"
										/>
										{#if $unreadMessageCount > 0}
											<span
												class="absolute -top-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-red-500 text-xs font-semibold text-white dark:border-gray-900"
											>
												{$unreadMessageCount > 99 ? '99+' : $unreadMessageCount}
											</span>
										{/if}
									</button>
								{/if}
								<button
									onclick={handleLogout}
									class="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-700 transition-all duration-200 hover:bg-gray-200 active:scale-95 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
									aria-label="Logout"
								>
									<FontAwesomeIcon icon={faArrowRightFromBracket} class="h-5 w-5" />
								</button>
							</div>
						</div>
					</div>
				</div>
			</div>
		</header>

		<div class="mx-auto max-w-7xl px-4 py-4 sm:px-6 sm:py-8 lg:px-8">
			<div class="mx-auto max-w-7xl space-y-6 sm:space-y-8">
				<!-- Hero Section -->
				<div
					class="relative overflow-hidden rounded-3xl bg-white shadow-sm dark:bg-gray-800 dark:shadow-none dark:ring-1 dark:ring-gray-700"
				>
					<div class="px-4 py-8 sm:px-8 sm:py-12 lg:px-12 lg:py-16">
						<!-- Header with Actions -->
						<div
							class="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-start sm:justify-between sm:gap-6"
						>
							<div class="min-w-0 flex-1">
								<!-- Status Banner -->
								{#if item.status === 'sold'}
									<div class="mb-6 flex-shrink-0">
										<div
											class="inline-flex items-center rounded-full bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700 dark:bg-red-900/10 dark:text-red-300"
										>
											<FontAwesomeIcon icon={faTag} class="mr-2 h-4 w-4" />
											<span class="font-semibold">Sold</span>
										</div>
									</div>
								{:else if item.status === 'hidden'}
									<div class="mb-6 flex-shrink-0">
										<div
											class="inline-flex items-center rounded-full bg-gray-50 px-4 py-2.5 text-sm font-medium text-gray-700 dark:bg-gray-700/50 dark:text-gray-300"
										>
											<FontAwesomeIcon icon={faTag} class="mr-2 h-4 w-4" />
											<span class="font-semibold">Hidden</span>
										</div>
									</div>
								{:else}
									<div class="mb-6 flex-shrink-0">
										<div
											class="inline-flex items-center rounded-full bg-green-50 px-4 py-2.5 text-sm font-medium text-green-700 dark:bg-green-900/10 dark:text-green-300"
										>
											<FontAwesomeIcon icon={faTag} class="mr-2 h-4 w-4" />
											<span class="font-semibold">Available</span>
										</div>
									</div>
								{/if}

								<!-- Owner Actions -->
								{#if canEdit}
									<div
										class="mt-4 flex w-full flex-col gap-2 sm:mt-0 sm:w-auto sm:shrink-0 sm:flex-row sm:flex-nowrap sm:gap-3"
									>
										{#if item.status !== 'sold'}
											<button
												onclick={openMarkAsSoldModal}
												disabled={markingAsSold}
												class="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-full border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-medium whitespace-nowrap text-red-700 transition-all hover:bg-red-100 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none sm:px-5 sm:py-3 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300 dark:hover:bg-red-900/30"
											>
												<FontAwesomeIcon icon={faCheckCircle} class="mr-2 h-4 w-4 shrink-0" />
												<span>{markingAsSold ? 'Marking...' : 'Mark as Sold'}</span>
											</button>
										{/if}
										<button
											onclick={() => (isEditOpen = true)}
											class="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-full border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium whitespace-nowrap text-gray-700 transition-all hover:bg-gray-50 active:scale-95 sm:flex-none sm:px-5 sm:py-3 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
										>
											<FontAwesomeIcon icon={faPencil} class="mr-2 h-4 w-4 shrink-0" />
											<span>Edit</span>
										</button>
										<button
											onclick={handleDeleteItem}
											disabled={deleting}
											class="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-full border border-red-200 bg-white px-4 py-2.5 text-sm font-medium whitespace-nowrap text-red-700 transition-all hover:bg-red-50 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none sm:px-5 sm:py-3 dark:border-red-600 dark:bg-red-900 dark:text-red-100 dark:hover:bg-red-900/30"
										>
											<FontAwesomeIcon icon={faTrash} class="mr-2 h-4 w-4 shrink-0" />
											<span>{deleting ? 'Deleting...' : 'Delete'}</span>
										</button>
										{#if item.photos && item.photos.length > 0}
											<button
												onclick={handleSetFeaturedImage}
												class="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-full border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium whitespace-nowrap text-gray-700 transition-all hover:bg-gray-50 active:scale-95 sm:flex-none sm:px-5 sm:py-3 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
											>
												<FontAwesomeIcon icon={faStar} class="mr-2 h-4 w-4 shrink-0" />
												<span class="hidden sm:inline">Set Featured Image</span>
												<span class="sm:hidden">Featured</span>
											</button>
										{/if}
									</div>
								{/if}
							</div>
						</div>

						<!-- Title and Content Section - Full Width -->
						<div class="w-full">
							<!-- Title -->
							<h1
								class="mb-4 text-3xl leading-tight font-bold break-words text-gray-900 sm:text-4xl dark:text-white"
							>
								{item.name}
							</h1>

							<!-- Image Gallery -->
							{#if item.photos && item.photos.length > 0}
								<div class="mb-6 w-full">
									{#if getDisplayPhotos().length === 1}
										{@const displayPhotos = getDisplayPhotos()}
										<!-- Single Image -->
										<button
											onclick={() => openImageViewer(0)}
											class="w-full overflow-hidden rounded-2xl transition-transform hover:scale-[1.02] active:scale-[0.98]"
										>
											<img
												src={getAuthenticatedImageUrl(displayPhotos[0])}
												alt={item.name}
												class="h-64 w-full object-cover sm:h-80"
												loading="lazy"
											/>
										</button>
									{:else}
										{@const displayPhotos = getDisplayPhotos()}
										<!-- Mobile: Carousel, Desktop: Grid -->
										<!-- Mobile Carousel (hidden on desktop) -->
										<div class="relative block sm:hidden">
											<!-- Image Container -->
											<div
												class="relative overflow-hidden rounded-2xl"
												ontouchstart={handleTouchStart}
												ontouchmove={handleTouchMove}
												ontouchend={handleTouchEnd}
											>
												<div
													class="flex transition-transform duration-300 ease-in-out"
													style="transform: translateX(-{currentImageIndex * 100}%)"
												>
													{#each displayPhotos as photo, index}
														<button
															onclick={() => openImageViewer(index)}
															class="min-w-full transition-transform active:scale-[0.98]"
														>
															<img
																src={getAuthenticatedImageUrl(photo)}
																alt="{item.name} - Image {index + 1}"
																class="h-64 w-full object-cover"
																loading="lazy"
															/>
														</button>
													{/each}
												</div>

												<!-- Navigation Buttons -->
												{#if displayPhotos.length > 1}
													<!-- Previous Button -->
													<button
														onclick={previousImage}
														class="absolute top-1/2 left-2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white transition-all hover:bg-black/70 active:scale-95 dark:bg-white/20 dark:hover:bg-white/30"
														aria-label="Previous image"
													>
														<FontAwesomeIcon icon={faChevronLeft} class="h-5 w-5" />
													</button>

													<!-- Next Button -->
													<button
														onclick={nextImage}
														class="absolute top-1/2 right-2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white transition-all hover:bg-black/70 active:scale-95 dark:bg-white/20 dark:hover:bg-white/30"
														aria-label="Next image"
													>
														<FontAwesomeIcon icon={faChevronRight} class="h-5 w-5" />
													</button>

													<!-- Image Indicators (Dots) -->
													<div class="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-2">
														{#each displayPhotos as _, index}
															<button
																onclick={() => goToImage(index)}
																class="h-2 rounded-full transition-all {currentImageIndex === index
																	? 'w-6 bg-white'
																	: 'w-2 bg-white/50 hover:bg-white/75'}"
																aria-label="Go to image {index + 1}"
															></button>
														{/each}
													</div>

													<!-- Image Counter -->
													<div
														class="absolute top-3 right-3 rounded-full bg-black/50 px-3 py-1 text-xs font-medium text-white dark:bg-white/20"
													>
														{currentImageIndex + 1} / {displayPhotos.length}
													</div>
												{/if}
											</div>
										</div>

										<!-- Desktop Grid (hidden on mobile) -->
										<div class="hidden sm:grid sm:grid-cols-2 sm:gap-3">
											{#each showAllImages ? displayPhotos : displayPhotos.slice(0, 4) as photo, index}
												<button
													onclick={() => openImageViewer(index)}
													class="overflow-hidden rounded-2xl transition-transform hover:scale-[1.02] active:scale-[0.98]"
												>
													<img
														src={getAuthenticatedImageUrl(photo)}
														alt="{item.name} - Image {index + 1}"
														class="h-32 w-full object-cover sm:h-40"
														loading="lazy"
													/>
												</button>
											{/each}
										</div>
										{#if displayPhotos.length > 4}
											<button
												onclick={() => (showAllImages = !showAllImages)}
												class="mt-2 hidden text-center text-sm font-medium text-blue-600 transition-colors hover:text-blue-700 active:scale-95 sm:block dark:text-blue-400 dark:hover:text-blue-300"
											>
												{showAllImages ? 'Show Less' : `+${displayPhotos.length - 4} more images`}
											</button>
										{/if}
									{/if}
								</div>
							{:else}
								<div
									class="mb-6 h-64 w-full rounded-2xl bg-linear-to-br from-gray-100 to-gray-200 sm:h-80 dark:from-gray-700 dark:to-gray-600"
								></div>
							{/if}

							<!-- Owner Information -->
							<div class="mb-6">
								<button
									onclick={() => item && goto(`/profile/${item.owner_id}`)}
									class="group flex items-center rounded-2xl bg-gray-100/60 px-4 py-3 backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:bg-blue-100/60 active:scale-95 dark:bg-gray-700/60 dark:hover:bg-blue-900/30"
								>
									<div
										class="mr-3 flex h-8 w-8 items-center justify-center rounded-full bg-linear-to-br from-blue-500 to-purple-600"
									>
										<FontAwesomeIcon icon={faUser} class="h-4 w-4 text-white" />
									</div>
									<div class="flex-1 text-left">
										<div class="flex items-center gap-2">
											<div class="text-sm font-semibold text-gray-700 dark:text-gray-200">
												Posted by {item.owner_username}
											</div>
											{#if item.owner_is_admin}
												<div
													class="flex items-center gap-1 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm"
													title="Admin Verified"
												>
													<FontAwesomeIcon icon={faShieldAlt} class="h-2.5 w-2.5" />
													<span>Admin</span>
												</div>
											{/if}
										</div>
										{#if item.created_at}
											<div class="text-xs text-gray-500 dark:text-gray-400">
												Posted {getDaysAgo(item.created_at)}
											</div>
										{/if}
									</div>
									<FontAwesomeIcon
										icon={faArrowRight}
										class="ml-2 h-4 w-4 text-gray-400 transition-colors group-hover:text-blue-600 dark:group-hover:text-blue-400"
									/>
								</button>
							</div>
						</div>
						<!-- Title and Content Section closes above -->
					</div>
					<!-- Padding div closes above -->
				</div>
				<!-- Hero Section closes above, still inside max-w-7xl -->

				<!-- Main Content Grid -->
				<div class="grid grid-cols-1 gap-6 sm:gap-8 lg:grid-cols-12">
					<!-- Left Column - Main Info -->
					<div class="space-y-6 sm:space-y-8 lg:col-span-8">
						<!-- Description Card -->
						{#if item.description}
							<div
								class="rounded-2xl bg-white p-4 shadow-sm sm:p-6 lg:p-8 dark:bg-gray-800 dark:shadow-none dark:ring-1 dark:ring-gray-700"
							>
								<h2 class="mb-4 text-xl font-semibold text-gray-900 dark:text-white">
									Description
								</h2>
								<p class="leading-relaxed text-gray-700 dark:text-gray-300">{item.description}</p>
							</div>
						{/if}

						<!-- Category Card -->
						{#if item.category}
							<div
								class="rounded-2xl bg-white p-4 shadow-sm sm:p-6 lg:p-8 dark:bg-gray-800 dark:shadow-none dark:ring-1 dark:ring-gray-700"
							>
								<h2 class="mb-4 text-xl font-semibold text-gray-900 dark:text-white">Category</h2>
								<span
									class="inline-flex items-center justify-center rounded-xl border border-gray-200/50 bg-blue-50/60 px-4 py-2 text-center text-sm font-medium text-gray-700 shadow-sm backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:bg-blue-50 hover:shadow-md dark:border-gray-700/50 dark:bg-blue-900/20 dark:text-gray-200 dark:hover:bg-blue-900/30"
								>
									{item.category}
								</span>
							</div>
						{/if}

						<!-- Condition and Quantity Card -->
						{#if item.condition || (item.quantity !== null && item.quantity !== undefined)}
							<div
								class="rounded-2xl bg-white p-4 shadow-sm sm:p-6 lg:p-8 dark:bg-gray-800 dark:shadow-none dark:ring-1 dark:ring-gray-700"
							>
								<h2 class="mb-4 text-xl font-semibold text-gray-900 dark:text-white">
									Item Details
								</h2>
								<div class="flex flex-wrap gap-3">
									{#if item.condition}
										<span
											class="inline-flex items-center gap-2 rounded-xl border border-gray-200/50 bg-blue-50/60 px-4 py-2 text-sm font-medium text-gray-700 shadow-sm backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:bg-blue-50 hover:shadow-md dark:border-gray-700/50 dark:bg-blue-900/20 dark:text-gray-200 dark:hover:bg-blue-900/30"
										>
											<FontAwesomeIcon icon={faTag} class="h-4 w-4" />
											<span class="font-semibold">Condition:</span>
											<span>{item.condition}</span>
										</span>
									{/if}
									{#if item.quantity !== null && item.quantity !== undefined}
										<span
											class="inline-flex items-center gap-2 rounded-xl border border-gray-200/50 bg-purple-50/60 px-4 py-2 text-sm font-medium text-gray-700 shadow-sm backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:bg-purple-50 hover:shadow-md dark:border-gray-700/50 dark:bg-purple-900/20 dark:text-gray-200 dark:hover:bg-purple-900/30"
										>
											<span class="font-semibold">Quantity:</span>
											<span>{item.quantity} {item.quantity === 1 ? 'item' : 'items'} available</span
											>
										</span>
									{/if}
								</div>
							</div>
						{/if}

						<!-- Contact Information Card -->
						{#if item.contact_phone || item.contact_email}
							<div
								class="rounded-2xl bg-white p-4 shadow-sm sm:p-6 lg:p-8 dark:bg-gray-800 dark:shadow-none dark:ring-1 dark:ring-gray-700"
							>
								<h2 class="mb-4 text-xl font-semibold text-gray-900 dark:text-white">
									Contact Information
								</h2>
								<div class="flex flex-wrap gap-3">
									{#if item.contact_phone}
										<a
											href={`tel:${item.contact_phone}`}
											class="inline-flex items-center rounded-full bg-green-100 px-4 py-2 text-sm font-medium text-green-800 transition-colors hover:bg-green-200 dark:bg-green-900/20 dark:text-green-200 dark:hover:bg-green-900/30"
										>
											<FontAwesomeIcon icon={faPhone} class="mr-2 h-4 w-4" />
											{formatPhone(item.contact_phone)}
										</a>
									{/if}
									{#if item.contact_email}
										<a
											href={`mailto:${item.contact_email}`}
											class="inline-flex items-center rounded-full bg-purple-100 px-4 py-2 text-sm font-medium text-purple-800 transition-colors hover:bg-purple-200 dark:bg-purple-900/20 dark:text-purple-200 dark:hover:bg-purple-900/30"
										>
											<FontAwesomeIcon icon={faEnvelope} class="mr-2 h-4 w-4" />
											{item.contact_email}
										</a>
									{/if}
								</div>
							</div>
						{/if}
					</div>

					<!-- Right Column - Sidebar -->
					<div class="space-y-6 lg:col-span-4">
						<!-- Price Card -->
						<div
							class="rounded-2xl bg-white p-6 shadow-sm dark:bg-gray-800 dark:shadow-none dark:ring-1 dark:ring-gray-700"
						>
							<div class="space-y-3">
								{#if item.price_reduced && item.original_price && !item.is_free}
									<div>
										<p class="text-sm font-medium text-gray-500 dark:text-gray-400">
											Original Price
										</p>
										<p class="text-lg font-semibold text-gray-400 line-through dark:text-gray-500">
											${formatPrice(item.original_price)}
										</p>
									</div>
								{/if}
								<div>
									<p class="text-sm font-medium text-gray-500 dark:text-gray-400">Price</p>
									<div class="flex items-baseline gap-2">
										{#if item.is_free}
											<p class="text-3xl font-bold text-green-600 dark:text-green-400">Free</p>
											<span
												class="inline-flex items-center gap-1 rounded-full bg-green-500 px-2 py-1 text-xs font-semibold text-white"
											>
												<FontAwesomeIcon icon={faTag} class="h-3 w-3" />
												Free Item
											</span>
										{:else}
											<p class="text-3xl font-bold text-gray-900 dark:text-white">
												${formatPrice(item.price)}
											</p>
											{#if item.price_reduced && item.price_reduction_percentage}
												<span
													class="inline-flex items-center gap-1 rounded-full bg-red-500 px-2 py-1 text-xs font-semibold text-white"
												>
													<FontAwesomeIcon icon={faTag} class="h-3 w-3" />
													-{item.price_reduction_percentage.toFixed(0)}%
												</span>
											{/if}
										{/if}
									</div>
								</div>
								{#if item.price_reduced && item.price_reduction_amount && item.price_reduction_percentage}
									<div class="rounded-lg bg-green-50 p-3 dark:bg-green-900/20">
										<p class="text-xs font-medium text-green-600 dark:text-green-400">
											Save ${formatPrice(item.price_reduction_amount)} ({item.price_reduction_percentage.toFixed(
												0
											)}% off)
										</p>
										{#if item.last_price_change_date}
											<p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
												Reduced on {formatDate(item.last_price_change_date)}
											</p>
										{/if}
									</div>
								{/if}
								{#if item.accepts_best_offer}
									<div
										class="flex items-center gap-2 rounded-lg bg-purple-50 p-3 dark:bg-purple-900/20"
									>
										<FontAwesomeIcon
											icon={faHandshake}
											class="h-4 w-4 text-purple-600 dark:text-purple-400"
										/>
										<p class="text-sm font-medium text-purple-700 dark:text-purple-300">
											Accepts Best Offer
										</p>
									</div>
								{/if}
							</div>
						</div>

						<!-- Action Buttons Card -->
						<div
							class="rounded-2xl bg-white p-4 shadow-sm sm:p-6 dark:bg-gray-800 dark:shadow-none dark:ring-1 dark:ring-gray-700"
						>
							<h3 class="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Actions</h3>
							<div class="space-y-3">
								{#if !isOwner}
									{#if existingConversation}
										<button
											onclick={viewConversation}
											class="flex w-full items-center justify-center rounded-full bg-green-500 px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-green-600 active:scale-95 dark:bg-green-600 dark:hover:bg-green-700"
										>
											<FontAwesomeIcon icon={faMessage} class="mr-2 h-4 w-4" />
											View Conversation
											{#if existingConversation.unread_count && existingConversation.unread_count > 0}
												<span
													class="ml-2 rounded-full bg-white/20 px-2 py-0.5 text-xs font-semibold"
													>{existingConversation.unread_count}</span
												>
											{/if}
										</button>
									{:else}
										<button
											onclick={() => (isMessageOpen = true)}
											disabled={checkingConversation}
											class="flex w-full items-center justify-center rounded-full bg-green-500 px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-green-600 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-green-600 dark:hover:bg-green-700"
										>
											<FontAwesomeIcon icon={faMessage} class="mr-2 h-4 w-4" />
											{checkingConversation ? 'Checking...' : 'Message Seller'}
										</button>
									{/if}
									<button
										onclick={toggleWatch}
										class="flex w-full items-center justify-center rounded-full border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-all hover:bg-gray-50 active:scale-95 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
									>
										<FontAwesomeIcon icon={faHeart} class="mr-2 h-4 w-4" />
										{isWatched ? 'Unwatch' : 'Watch'}
									</button>
									{#if item.contact_phone}
										<a
											href={`tel:${item.contact_phone}`}
											class="flex w-full items-center justify-center rounded-full bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-blue-700 active:scale-95 dark:bg-blue-600 dark:hover:bg-blue-700"
										>
											<FontAwesomeIcon icon={faPhone} class="mr-2 h-4 w-4" />
											Call Seller
										</a>
									{/if}
									{#if item.contact_email}
										<a
											href={`mailto:${item.contact_email}`}
											class="flex w-full items-center justify-center rounded-full bg-purple-600 px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-purple-700 active:scale-95 dark:bg-purple-600 dark:hover:bg-purple-700"
										>
											<FontAwesomeIcon icon={faEnvelope} class="mr-2 h-4 w-4" />
											Email Seller
										</a>
									{/if}
								{/if}
								{#if item.venmo_url}
									<a
										href={item.venmo_url}
										target="_blank"
										rel="noopener noreferrer"
										class="flex w-full items-center justify-center rounded-full bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-blue-700 active:scale-95 dark:bg-blue-600 dark:hover:bg-blue-700"
									>
										<FontAwesomeIcon icon={faMoneyBillWave} class="mr-2 h-4 w-4" />
										Venmo
									</a>
								{/if}
								{#if item.facebook_url}
									<a
										href={item.facebook_url}
										target="_blank"
										rel="noopener noreferrer"
										class="flex w-full items-center justify-center rounded-full bg-blue-700 px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-blue-800 active:scale-95 dark:bg-blue-700 dark:hover:bg-blue-800"
									>
										<FontAwesomeIcon icon={faFacebook} class="mr-2 h-4 w-4" />
										Facebook Marketplace
									</a>
								{/if}
							</div>
						</div>
					</div>
				</div>
				<!-- Main Content Grid closes above -->

				<!-- Comments Section (still inside max-w-7xl) -->
				<div
					class="overflow-hidden rounded-2xl bg-white shadow-sm dark:bg-gray-800 dark:shadow-none dark:ring-1 dark:ring-gray-700"
				>
					<div
						class="border-b border-gray-200 px-4 py-4 sm:px-6 sm:py-6 lg:px-8 dark:border-gray-700"
					>
						<h2 class="text-xl font-semibold text-gray-900 dark:text-white">
							Comments ({comments.length})
						</h2>
					</div>

					<!-- Add Comment Form -->
					{#if currentUser}
						<div
							class="border-b border-gray-200 px-4 py-4 sm:px-6 sm:py-6 lg:px-8 dark:border-gray-700"
						>
							<form
								onsubmit={(e) => {
									e.preventDefault();
									submitComment(e);
								}}
							>
								<div class="mb-6">
									<label
										for="comment"
										class="mb-3 block text-sm font-medium text-gray-700 dark:text-gray-300"
									>
										Add a Comment
									</label>
									<textarea
										id="comment"
										bind:value={newComment}
										rows="4"
										placeholder="Ask a question or share your thoughts about this item..."
										class="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm shadow-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-blue-400 dark:focus:ring-blue-400/20"
										required
									></textarea>
								</div>
								<button
									type="submit"
									disabled={submittingComment || !newComment.trim()}
									class="inline-flex min-h-[44px] items-center justify-center rounded-full bg-blue-600 px-6 py-3 text-sm font-medium text-white transition-all hover:bg-blue-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
								>
									{#if submittingComment}
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
										Posting...
									{:else}
										Post Comment
									{/if}
								</button>
							</form>
						</div>
					{:else}
						<div
							class="border-b border-gray-200 px-4 py-4 sm:px-6 sm:py-6 lg:px-8 dark:border-gray-700"
						>
							<div class="rounded-xl bg-gray-50 p-4 dark:bg-gray-800">
								<div class="flex">
									<svg
										class="h-5 w-5 text-gray-400"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
										/>
									</svg>
									<div class="ml-3">
										<h3 class="text-sm font-medium text-gray-800 dark:text-gray-200">
											Sign in to comment
										</h3>
										<div class="mt-2 text-sm text-gray-700 dark:text-gray-300">
											<p>
												<a
													href="/login"
													class="font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
													>Sign in</a
												>
												to leave a comment
											</p>
										</div>
									</div>
								</div>
							</div>
						</div>
					{/if}

					<!-- Comments List -->
					<div class="px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
						{#if comments.length === 0}
							<div class="py-8 text-center">
								<svg
									class="mx-auto h-12 w-12 text-gray-400"
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
								<h3 class="mt-2 text-sm font-medium text-gray-900 dark:text-white">
									No comments yet
								</h3>
								<p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
									Be the first to ask a question or share your thoughts!
								</p>
							</div>
						{:else}
							<div class="space-y-6">
								{#each comments as comment (comment.id)}
									<div
										class="border-b border-gray-200 pb-6 last:border-b-0 last:pb-0 dark:border-gray-700"
									>
										<div class="flex items-start space-x-3">
											<div class="shrink-0">
												<div
													class="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/20"
												>
													<span class="text-sm font-medium text-blue-600 dark:text-blue-400">
														{(comment.username ?? 'Anonymous').charAt(0).toUpperCase()}
													</span>
												</div>
											</div>
											<div class="min-w-0 flex-1">
												<div class="flex items-center space-x-2">
													<p class="text-sm font-medium text-gray-900 dark:text-white">
														{comment.username ?? 'Anonymous'}
													</p>
													<span class="text-sm text-gray-500 dark:text-gray-400">•</span>
													<time
														class="text-sm text-gray-500 dark:text-gray-400"
														datetime={comment.created_at}
													>
														{getRelativeTime(comment.created_at)}
													</time>
													{#if currentUser && comment.user_id === currentUser.id}
														<button
															onclick={() => handleDeleteComment(comment.id)}
															class="ml-auto text-xs text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
														>
															Delete
														</button>
													{/if}
												</div>
												<div class="mt-1 text-sm text-gray-700 dark:text-gray-300">
													<p>{comment.content}</p>
												</div>
											</div>
										</div>
									</div>
								{/each}
							</div>
						{/if}
					</div>
					<!-- Comments List container closes above -->
				</div>
				<!-- Comments Section closes above -->
			</div>
			<!-- max-w-7xl space-y-6 closes above -->
		</div>
		<!-- max-w-7xl px-4 py-4 closes above -->
	{/if}

	<!-- Edit Modal -->
	{#if item}
		<EditMarketItemModal
			isOpen={isEditOpen}
			onClose={() => (isEditOpen = false)}
			onSuccess={handleEditSuccess}
			{item}
		/>
	{/if}

	<!-- Featured Image Modal -->
	{#if item && showFeaturedImageModal}
		<MarketItemFeaturedImageModal
			isOpen={showFeaturedImageModal}
			itemId={item.id}
			onClose={handleCloseFeaturedImageModal}
			onSuccess={handleFeaturedImageSuccess}
		/>
	{/if}

	<!-- Message Modal -->
	{#if item}
		<MarketItemMessageModal
			isOpen={isMessageOpen}
			itemId={item.id}
			itemName={item.name}
			onClose={() => (isMessageOpen = false)}
			onSuccess={handleMessageSuccess}
		/>
	{/if}

	<!-- Mark as Sold Confirmation Modal -->
	{#if item}
		<ConfirmationModal
			isOpen={showMarkAsSoldModal}
			onClose={closeMarkAsSoldModal}
			onConfirm={markAsSold}
			title="Mark Item as Sold"
			message={`Are you sure you want to mark {itemName} as sold? This action can be undone by editing the item and changing its status back to "Active".`}
			confirmText="Mark as Sold"
			cancelText="Cancel"
			type="danger"
			loading={markingAsSold}
			itemName={item.name}
		/>
	{/if}

	<!-- Delete Confirmation Modal -->
	<DeleteConfirmationModal
		isOpen={showDeleteModal}
		itemName="market item"
		onClose={handleCloseDeleteModal}
		onConfirm={handleConfirmDelete}
	/>

	<!-- Full-Screen Image Viewer Modal -->
	{#if imageViewerOpen && item}
		{@const displayPhotos = getDisplayPhotos()}
		<div
			class="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
			onclick={closeImageViewer}
			onkeydown={(e) => {
				if (e.key === 'Escape') closeImageViewer();
			}}
			role="dialog"
			aria-modal="true"
			aria-label="Image viewer"
			tabindex="-1"
		>
			<!-- Close Button -->
			<button
				onclick={closeImageViewer}
				class="absolute top-4 right-4 z-10 rounded-full bg-white/10 p-3 text-white transition-all hover:bg-white/20 active:scale-95 dark:bg-gray-800/50 dark:hover:bg-gray-800/70"
				aria-label="Close viewer"
			>
				<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M6 18L18 6M6 6l12 12"
					/>
				</svg>
			</button>

			<!-- Image Container -->
			<div class="relative max-h-full max-w-full" onclick={(e) => e.stopPropagation()}>
				<img
					src={getAuthenticatedImageUrl(displayPhotos[viewerImageIndex])}
					alt="{item.name} - Image {viewerImageIndex + 1}"
					class="max-h-full max-w-full object-contain"
				/>

				<!-- Navigation Buttons -->
				{#if displayPhotos.length > 1}
					<!-- Previous Button -->
					<button
						onclick={(e) => {
							e.stopPropagation();
							previousViewerImage();
						}}
						class="absolute top-1/2 left-4 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white transition-all hover:bg-white/20 active:scale-95 dark:bg-gray-800/50 dark:hover:bg-gray-800/70"
						aria-label="Previous image"
					>
						<FontAwesomeIcon icon={faChevronLeft} class="h-6 w-6" />
					</button>

					<!-- Next Button -->
					<button
						onclick={(e) => {
							e.stopPropagation();
							nextViewerImage();
						}}
						class="absolute top-1/2 right-4 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white transition-all hover:bg-white/20 active:scale-95 dark:bg-gray-800/50 dark:hover:bg-gray-800/70"
						aria-label="Next image"
					>
						<FontAwesomeIcon icon={faChevronRight} class="h-6 w-6" />
					</button>

					<!-- Image Counter -->
					<div
						class="absolute top-4 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-4 py-2 text-sm font-medium text-white dark:bg-white/20"
					>
						{viewerImageIndex + 1} / {displayPhotos.length}
					</div>

					<!-- Dot Indicators -->
					<div class="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
						{#each displayPhotos as _, index}
							<button
								onclick={(e) => {
									e.stopPropagation();
									viewerImageIndex = index;
								}}
								class="h-2 rounded-full transition-all {viewerImageIndex === index
									? 'w-6 bg-white'
									: 'w-2 bg-white/50 hover:bg-white/75'}"
								aria-label="Go to image {index + 1}"
							></button>
						{/each}
					</div>
				{/if}
			</div>
		</div>
	{/if}
</div>

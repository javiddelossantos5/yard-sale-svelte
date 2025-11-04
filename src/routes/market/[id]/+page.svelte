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
		getMarketItemConversations,
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
		faArrowRightFromBracket
	} from '@fortawesome/free-solid-svg-icons';
	import EditMarketItemModal from '$lib/EditMarketItemModal.svelte';
	import MarketItemMessageModal from '$lib/MarketItemMessageModal.svelte';
	import MarketItemFeaturedImageModal from '$lib/MarketItemFeaturedImageModal.svelte';
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

	function handleSetFeaturedImage() {
		if (currentUser && item && currentUser.id === item.owner_id) {
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

<div class="min-h-screen bg-gray-50 dark:bg-gray-900">
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
							<img
								src="/icon2.png"
								alt="Yard Sale Finder Logo"
								class="h-12 w-12 shrink-0 rounded-xl object-cover shadow-sm"
							/>
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

		<div class="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
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
		</div>

		<!-- Separate info section (not attached to the image) -->
		<div class="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
			<div
				class="rounded-3xl bg-white/90 p-6 shadow-[0_1px_0_rgba(255,255,255,0.6),0_20px_40px_rgba(0,0,0,0.06)] ring-1 ring-black/5 backdrop-blur dark:bg-gray-800/90 dark:ring-gray-700"
			>
				<div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
					<div class="min-w-0 flex-1">
						<h1 class="truncate text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
							{item.name}
						</h1>
						<p class="mt-1 text-sm text-gray-600 dark:text-gray-300">{item.description}</p>

						<!-- Seller Information -->
						<div class="mt-3">
							<button
								onclick={() => {
									if (item) goto(`/profile/${item.owner_id}`);
								}}
								class="flex items-center rounded-full bg-gray-100/60 px-3 py-2 text-sm text-gray-700 transition-all duration-300 hover:bg-blue-100/60 hover:text-blue-700 dark:bg-gray-700/60 dark:text-gray-200 dark:hover:bg-blue-900/30 dark:hover:text-blue-300"
							>
								<div
									class="mr-2 flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600"
								>
									<FontAwesomeIcon icon={faUser} class="h-3 w-3 text-white" />
								</div>
								<span class="font-semibold">by {item?.owner_username || 'Unknown'}</span>
							</button>
						</div>

						{#if item.created_at}
							<p class="mt-2 text-xs text-gray-500 dark:text-gray-400">
								Posted {getDaysAgo(item.created_at)}
							</p>
						{/if}
					</div>
					<div class="flex shrink-0 flex-col items-end gap-2">
						<div class="flex flex-col items-end gap-1">
							<div class="flex items-center gap-2">
								{#if item.price_reduced && item.original_price}
									<span class="text-sm text-gray-500 line-through dark:text-gray-400">
										Was ${formatPrice(item.original_price)}
									</span>
								{/if}
								<div
									class="inline-flex items-center rounded-2xl bg-gray-100 px-3 py-1.5 text-base font-semibold text-gray-900 ring-1 ring-black/5 ring-inset dark:bg-gray-700 dark:text-white dark:ring-white/10"
								>
									Now ${formatPrice(item.price)}
								</div>
								{#if item.price_reduced && item.price_reduction_amount && item.price_reduction_percentage}
									<div
										class="inline-flex items-center gap-1 rounded-full bg-red-500/90 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-md"
										title="Reduced by $${formatPrice(
											item.price_reduction_amount
										)} (${item.price_reduction_percentage.toFixed(0)}%)"
									>
										<FontAwesomeIcon icon={faTag} class="h-3.5 w-3.5" />
										-{item.price_reduction_percentage.toFixed(0)}%
									</div>
								{/if}
							</div>
							{#if item.price_reduced && item.price_reduction_amount && item.price_reduction_percentage}
								<div class="text-sm font-medium text-red-600 dark:text-red-400">
									Save ${formatPrice(item.price_reduction_amount)} ({item.price_reduction_percentage.toFixed(
										0
									)}% off)
								</div>
							{/if}
							{#if item.price_reduced && item.last_price_change_date}
								<div class="text-xs text-gray-500 dark:text-gray-400">
									Reduced on {formatDate(item.last_price_change_date)}
								</div>
							{/if}
						</div>
						<div class="flex items-center gap-2">
							{#if isOwner}
								<button
									onclick={() => (isEditOpen = true)}
									class="inline-flex items-center rounded-xl bg-blue-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 active:scale-95"
									aria-label="Edit item"
								>
									<FontAwesomeIcon icon={faPencil} class="mr-2 h-4 w-4" />
									Edit
								</button>
								{#if item.photos && item.photos.length > 0}
									<button
										onclick={handleSetFeaturedImage}
										class="inline-flex items-center rounded-xl bg-purple-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-purple-700 active:scale-95"
										aria-label="Set featured image"
									>
										<FontAwesomeIcon icon={faStar} class="mr-2 h-4 w-4" />
										<span class="hidden sm:inline">Set Featured Image</span>
										<span class="sm:hidden">Featured</span>
									</button>
								{/if}
							{/if}
							{#if !isOwner}
								{#if existingConversation}
									<button
										onclick={viewConversation}
										class="inline-flex items-center rounded-xl bg-green-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-green-700 active:scale-95"
									>
										<FontAwesomeIcon icon={faMessage} class="mr-2 h-4 w-4" />
										View Conversation
										{#if existingConversation.unread_count && existingConversation.unread_count > 0}
											<span class="ml-2 rounded-full bg-white/20 px-2 py-0.5 text-xs font-semibold"
												>{existingConversation.unread_count}</span
											>
										{/if}
									</button>
								{:else}
									<button
										onclick={() => (isMessageOpen = true)}
										disabled={checkingConversation}
										class="inline-flex items-center rounded-xl bg-green-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-green-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
									>
										<FontAwesomeIcon icon={faMessage} class="mr-2 h-4 w-4" />
										{checkingConversation ? 'Checking...' : 'Message Seller'}
									</button>
								{/if}
								<button
									onclick={toggleWatch}
									class="inline-flex items-center rounded-xl bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-gray-200 transition hover:bg-gray-50 active:scale-95 dark:bg-gray-700 dark:text-gray-200 dark:ring-gray-600"
								>
									<FontAwesomeIcon icon={faHeart} class="mr-2 h-4 w-4" />
									{isWatched ? 'Unwatch' : 'Watch'}
								</button>
							{/if}
						</div>
					</div>
				</div>
				{#if item.accepts_best_offer}
					<div class="mt-3">
						<span
							class="inline-flex items-center gap-1.5 rounded-full bg-purple-50 px-3 py-1.5 text-sm font-semibold text-purple-600 ring-1 ring-purple-100 ring-inset dark:bg-purple-900/30 dark:text-purple-200 dark:ring-purple-800/60"
							title="Accepts best offer"
						>
							<FontAwesomeIcon icon={faHandshake} class="h-4 w-4" />
							Accepts Best Offer
						</span>
					</div>
				{/if}
				<div class="mt-3 flex flex-wrap items-center gap-2">
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

				<!-- Contact Information -->
				{#if item.contact_phone || item.contact_email}
					<div class="mt-4 border-t border-gray-200 pt-4 dark:border-gray-700">
						<h3 class="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
							Contact Information
						</h3>
						<div class="flex flex-wrap items-center gap-2">
							{#if item.contact_phone}
								<a
									href={`tel:${item.contact_phone}`}
									onclick={(e) => e.stopPropagation()}
									class="inline-flex items-center rounded-xl bg-green-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-green-700 active:scale-95"
								>
									<FontAwesomeIcon icon={faPhone} class="mr-2 h-4 w-4" />
									Call {formatPhone(item.contact_phone)}
								</a>
							{/if}
							{#if item.contact_email}
								<a
									href={`mailto:${item.contact_email}`}
									onclick={(e) => e.stopPropagation()}
									class="inline-flex items-center rounded-xl bg-blue-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 active:scale-95"
								>
									<FontAwesomeIcon icon={faEnvelope} class="mr-2 h-4 w-4" />
									Email {item.contact_email}
								</a>
							{/if}
						</div>
					</div>
				{/if}
			</div>
		</div>

		<!-- Comments Section -->
		<div class="mx-auto max-w-5xl px-4 pt-8 pb-12">
			<div
				class="rounded-3xl bg-white/90 p-8 shadow-[0_1px_0_rgba(255,255,255,0.6),0_20px_40px_rgba(0,0,0,0.06)] ring-1 ring-black/5 backdrop-blur-xl dark:bg-gray-800/90 dark:ring-gray-700"
			>
				<div class="mb-8">
					<h2 class="text-2xl font-semibold tracking-tight text-gray-900 dark:text-white">
						Comments
					</h2>
					<p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
						{comments.length === 0
							? 'No comments yet'
							: comments.length === 1
								? '1 comment'
								: `${comments.length} comments`}
					</p>
				</div>

				<!-- Comment Input -->
				{#if currentUser}
					<form
						onsubmit={submitComment}
						class="mb-10 rounded-2xl bg-gray-50/80 p-4 ring-1 ring-gray-200/50 backdrop-blur-sm transition-all hover:ring-gray-300/50 dark:bg-gray-700/30 dark:ring-gray-600/50 dark:hover:ring-gray-500/50"
					>
						<div class="flex items-start gap-3">
							<!-- Avatar -->
							<div
								class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-sm font-semibold text-white shadow-sm ring-2 ring-white/50 dark:ring-gray-800/50"
							>
								{#if currentUser.username}
									{currentUser.username.charAt(0).toUpperCase()}
								{:else}
									<FontAwesomeIcon icon={faUser} class="h-5 w-5" />
								{/if}
							</div>

							<!-- Input -->
							<div class="flex-1">
								<textarea
									bind:value={newComment}
									placeholder="Add a comment..."
									rows="3"
									disabled={submittingComment}
									class="w-full resize-none rounded-xl border-0 bg-white px-4 py-3 text-[15px] text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500/50 focus:outline-none dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500"
								></textarea>
								<div class="mt-3 flex items-center justify-end gap-2">
									<button
										type="submit"
										disabled={!newComment.trim() || submittingComment}
										class="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-blue-700 hover:shadow-md active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-blue-600 disabled:hover:shadow-sm dark:bg-blue-500 dark:hover:bg-blue-600"
									>
										{#if submittingComment}
											<span
												class="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
											></span>
											Posting...
										{:else}
											<FontAwesomeIcon icon={faPaperPlane} class="h-4 w-4" />
											Post Comment
										{/if}
									</button>
								</div>
							</div>
						</div>
					</form>
				{:else}
					<div
						class="mb-10 rounded-2xl bg-gray-50/50 p-6 text-center ring-1 ring-gray-200/50 dark:bg-gray-700/20 dark:ring-gray-600/30"
					>
						<p class="text-sm text-gray-600 dark:text-gray-400">
							<a
								href="/login"
								class="font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400">Sign in</a
							>
							to leave a comment
						</p>
					</div>
				{/if}

				<!-- Comments List -->
				{#if comments.length > 0}
					<div class="space-y-6">
						{#each comments as c}
							{@const isMine = currentUser && c.user_id === currentUser.id}
							<div class="flex gap-4 {isMine ? 'flex-row-reverse' : ''}">
								<!-- Avatar -->
								<div
									class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br shadow-sm ring-2 {isMine
										? 'from-blue-500 to-purple-600 ring-white/50 dark:ring-gray-800/50'
										: 'from-gray-400 to-gray-500 ring-white/50 dark:ring-gray-800/50'}"
								>
									<span class="text-sm font-semibold text-white">
										{(c.username ?? 'Anonymous').charAt(0).toUpperCase()}
									</span>
								</div>

								<!-- Comment Content -->
								<div class="flex min-w-0 flex-1 flex-col {isMine ? 'items-end' : 'items-start'}">
									<div
										class="group relative inline-flex max-w-[75%] flex-col rounded-2xl px-4 py-3 shadow-sm ring-1 transition-all hover:shadow-md {isMine
											? 'bg-blue-600 text-white ring-blue-500/20'
											: 'bg-gray-100 text-gray-900 ring-gray-200/50 dark:bg-gray-700/80 dark:text-gray-100 dark:ring-gray-600/50'}"
									>
										<!-- Username and Timestamp -->
										<div class="mb-1.5 flex items-baseline gap-2">
											<span
												class="text-[13px] font-semibold {isMine
													? 'text-white'
													: 'text-gray-900 dark:text-gray-100'}"
											>
												{isMine ? 'You' : (c.username ?? 'Anonymous')}
											</span>
											<span
												class="text-[11px] font-normal {isMine
													? 'text-white/70'
													: 'text-gray-500 dark:text-gray-400'}"
											>
												{getRelativeTime(c.created_at)}
											</span>
										</div>

										<!-- Comment Text -->
										<p
											class="text-[15px] leading-relaxed {isMine
												? 'text-white'
												: 'text-gray-900 dark:text-gray-100'}"
										>
											{c.content}
										</p>

										<!-- Delete Button -->
										{#if isMine}
											<button
												onclick={() => handleDeleteComment(c.id)}
												class="absolute right-0 -bottom-8 mt-2 flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-gray-500 opacity-0 transition-all group-hover:opacity-100 hover:bg-gray-100 hover:text-red-600 active:scale-95 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-red-400"
											>
												<FontAwesomeIcon icon={faTrash} class="h-3 w-3" />
												Delete
											</button>
										{/if}
									</div>
								</div>
							</div>
						{/each}
					</div>
				{:else}
					<div class="py-16 text-center">
						<div
							class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700"
						>
							<FontAwesomeIcon icon={faMessage} class="h-7 w-7 text-gray-400 dark:text-gray-500" />
						</div>
						<p class="text-sm font-medium text-gray-900 dark:text-gray-100">No comments yet</p>
						<p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
							Be the first to share your thoughts about this item
						</p>
					</div>
				{/if}
			</div>
		</div>
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

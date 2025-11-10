<script lang="ts">
	import { goto } from '$app/navigation';
	import type { Event } from './api';
	import { getAuthenticatedImageUrl } from './api';
	import { FontAwesomeIcon } from '@fortawesome/svelte-fontawesome';
	import {
		faChevronLeft,
		faChevronRight,
		faShieldAlt,
		faCommentDots,
		faMapMarkerAlt,
		faCalendar,
		faClock,
		faTag,
		faUser,
		faDollarSign
	} from '@fortawesome/free-solid-svg-icons';
	import { faFacebook, faInstagram } from '@fortawesome/free-brands-svg-icons';

	let { event }: { event: Event } = $props();

	// Image carousel state for card
	let cardImageIndex = $state(0);

	function getDisplayImages() {
		if (!event.gallery_urls || event.gallery_urls.length === 0) return [];
		const images = event.gallery_urls;
		const featuredImage = event.featured_image;
		if (featuredImage && images.includes(featuredImage)) {
			return [featuredImage, ...images.filter((img) => img !== featuredImage)];
		}
		return images;
	}

	const currentImageUrl = $derived(() => {
		const displayImages = getDisplayImages();
		if (displayImages.length === 0) return '';
		return getAuthenticatedImageUrl(displayImages[cardImageIndex] || '');
	});

	$effect(() => {
		if (event) {
			cardImageIndex = 0;
		}
	});

	function nextCardImage(e: MouseEvent) {
		e.preventDefault();
		e.stopPropagation();
		const images = getDisplayImages();
		if (images.length > 0) {
			cardImageIndex = (cardImageIndex + 1) % images.length;
		}
	}

	function previousCardImage(e: MouseEvent) {
		e.preventDefault();
		e.stopPropagation();
		const images = getDisplayImages();
		if (images.length > 0) {
			cardImageIndex = cardImageIndex === 0 ? images.length - 1 : cardImageIndex - 1;
		}
	}

	function formatDate(dateString: string | null | undefined): string {
		if (!dateString) return '';
		try {
			return new Date(dateString).toLocaleDateString('en-US', {
				weekday: 'short',
				month: 'short',
				day: 'numeric',
				timeZone: event.timezone || 'America/Denver'
			});
		} catch {
			return '';
		}
	}

	function formatTime(timeString: string | null | undefined): string {
		if (!timeString) return '';
		try {
			return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
				hour: 'numeric',
				minute: '2-digit',
				hour12: true,
				timeZone: event.timezone || 'America/Denver'
			});
		} catch {
			return '';
		}
	}

	function formatPrice(price: number | null | undefined): string {
		if (price === null || price === undefined) return '';
		return new Intl.NumberFormat('en-US', {
			minimumFractionDigits: 2,
			maximumFractionDigits: 2
		}).format(price);
	}

	function getStatusColor(status: string): string {
		switch (status) {
			case 'ongoing':
				return 'bg-green-600/90 text-white';
			case 'ended':
				return 'bg-gray-600/90 text-white';
			case 'cancelled':
				return 'bg-red-600/90 text-white';
			default:
				return 'bg-blue-600/90 text-white';
		}
	}

	function getStatusLabel(status: string): string {
		switch (status) {
			case 'ongoing':
				return 'Ongoing';
			case 'ended':
				return 'Ended';
			case 'cancelled':
				return 'Cancelled';
			default:
				return 'Upcoming';
		}
	}

	function getTypeLabel(type: string): string {
		const labels: Record<string, string> = {
			event: 'Event',
			informational: 'Info',
			advertisement: 'Ad',
			announcement: 'Announcement',
			lost_found: 'Lost & Found',
			request_help: 'Request Help',
			offer_help: 'Offer Help',
			service_offer: 'Service',
			weather: 'Weather',
			job_posting: 'Job Posting'
		};
		return labels[type] || type;
	}

	function getEmploymentTypeLabel(type: string | null | undefined): string {
		if (!type) return '';
		const labels: Record<string, string> = {
			full_time: 'Full Time',
			part_time: 'Part Time',
			contract: 'Contract',
			temporary: 'Temporary',
			seasonal: 'Seasonal',
			internship: 'Internship'
		};
		return labels[type] || type;
	}

	function openEvent(e?: MouseEvent | KeyboardEvent) {
		if (e) {
			e.preventDefault();
			e.stopPropagation();
		}
		const targetUrl = `/events/${event.id}`;
		if (typeof window !== 'undefined') {
			window.location.href = targetUrl;
		} else {
			goto(targetUrl);
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			event.stopPropagation();
			openEvent();
		}
	}
</script>

<div
	role="button"
	tabindex="0"
	onclick={(e) => openEvent(e)}
	onkeydown={handleKeydown}
	class="group cursor-pointer overflow-hidden rounded-3xl bg-white/80 shadow-[0_1px_0_rgba(255,255,255,0.6),0_20px_40px_rgba(0,0,0,0.06)] ring-1 ring-black/5 backdrop-blur-xl transition-all duration-300 ease-out outline-none hover:-translate-y-1 hover:shadow-[0_1px_0_rgba(255,255,255,0.7),0_30px_60px_rgba(0,0,0,0.1)] focus-visible:-translate-y-1 focus-visible:ring-2 focus-visible:ring-blue-500/70 active:scale-[0.99] dark:bg-gray-800/80 dark:ring-gray-700"
	data-event-id={event.id}
>
	<!-- Image Section -->
	{#if event.featured_image || (event.gallery_urls && event.gallery_urls.length > 0)}
		{@const displayImages = getDisplayImages()}
		{@const hasMultipleImages = displayImages.length > 1}
		<div class="relative overflow-hidden">
			<img
				src={currentImageUrl()}
				alt={event.title}
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
					onkeydown={(e) => e.stopPropagation()}
					role="presentation"
					aria-hidden="true"
				>
					{cardImageIndex + 1} / {displayImages.length}
				</div>
			{/if}

			<!-- Overlay Badges -->
			<div class="absolute inset-0 flex items-start justify-between p-3">
				<!-- Comment Count -->
				{#if event.comment_count > 0}
					<div
						class="flex items-center gap-1.5 rounded-full bg-black/50 px-2.5 py-1.5 text-xs font-medium text-white backdrop-blur-md"
					>
						<FontAwesomeIcon icon={faCommentDots} class="h-3 w-3" />
						<span>{event.comment_count}</span>
					</div>
				{/if}

				<!-- Status Badge -->
				<div
					class="rounded-full px-3 py-1.5 text-xs font-semibold backdrop-blur-md {getStatusColor(
						event.status
					)}"
				>
					{getStatusLabel(event.status)}
				</div>
			</div>
		</div>
	{/if}

	<!-- Content Section -->
	<div class="p-4">
		<!-- Type and Title -->
		<div class="mb-2 flex items-center gap-2">
			<span
				class="inline-flex items-center rounded-full bg-purple-100 px-2.5 py-1 text-xs font-semibold text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
			>
				{getTypeLabel(event.type)}
			</span>
		</div>
		<h3
			class="mb-1.5 line-clamp-2 text-lg font-semibold tracking-tight text-gray-900 dark:text-white"
		>
			{event.title}
		</h3>

		<!-- Job Posting Fields -->
		{#if event.type === 'job_posting'}
			<div class="mb-2 space-y-1">
				{#if event.job_title}
					<p class="text-sm font-semibold text-gray-900 dark:text-white">
						{event.job_title}
					</p>
				{/if}
				{#if event.employment_type}
					<p class="text-xs text-gray-600 dark:text-gray-400">
						{getEmploymentTypeLabel(event.employment_type)}
					</p>
				{/if}
			</div>
		{/if}

		<!-- Weather Fields -->
		{#if event.type === 'weather' && event.weather_conditions}
			<div class="mb-2">
				<p class="text-sm font-medium text-gray-700 dark:text-gray-300">
					{event.weather_conditions}
				</p>
			</div>
		{/if}

		{#if event.description}
			<p class="mb-2 line-clamp-2 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
				{event.description}
			</p>
		{/if}

		<!-- Organizer Information -->
		<div class="mb-2">
			<button
				onclick={(e) => {
					e.stopPropagation();
					goto(`/profile/${event.organizer_id}`);
				}}
				class="flex items-center rounded-full bg-gray-100/60 px-2.5 py-1.5 text-xs text-gray-700 transition-all duration-300 hover:bg-blue-100/60 hover:text-blue-700 dark:bg-gray-700/60 dark:text-gray-200 dark:hover:bg-blue-900/30 dark:hover:text-blue-300"
			>
				{#if event.organizer_profile_picture && event.organizer_profile_picture.trim() !== ''}
					<img
						src={getAuthenticatedImageUrl(event.organizer_profile_picture)}
						alt={event.organizer_username}
						class="mr-1.5 h-5 w-5 rounded-full object-cover ring-1 ring-gray-200 dark:ring-gray-700"
						onerror={(e) => {
							const img = e.target as HTMLImageElement;
							img.style.display = 'none';
							const fallback = img.parentElement?.querySelector(
								'.organizer-fallback'
							) as HTMLElement;
							if (fallback) fallback.style.display = 'flex';
						}}
					/>
				{/if}
				<div
					class="organizer-fallback mr-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 {event.organizer_profile_picture &&
					event.organizer_profile_picture.trim() !== ''
						? 'hidden'
						: ''}"
				>
					<span class="text-[10px] font-bold text-white">
						{event.organizer_username.charAt(0).toUpperCase()}
					</span>
				</div>
				<span class="font-semibold">by {event.organizer_username}</span>
				{#if event.organizer_is_admin}
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

		<!-- Location -->
		{#if event.city || event.state || event.address}
			<div class="mb-2 flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
				<FontAwesomeIcon icon={faMapMarkerAlt} class="h-3 w-3" />
				<span>
					{#if event.address}
						{event.address}
						{#if event.city || event.state},
						{/if}
					{/if}
					{#if event.city}
						{event.city}
						{#if event.state},
						{/if}
					{/if}
					{#if event.state}
						{event.state}
					{/if}
					{#if event.zip}
						{event.zip}
					{/if}
				</span>
			</div>
		{/if}

		<!-- Date & Time -->
		{#if event.start_date || event.start_time}
			<div class="mb-2 space-y-1">
				{#if event.start_date}
					<div class="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
						<FontAwesomeIcon icon={faCalendar} class="h-3 w-3" />
						<span>
							{formatDate(event.start_date)}
							{#if event.end_date && event.end_date !== event.start_date}
								- {formatDate(event.end_date)}
							{/if}
						</span>
					</div>
				{/if}
				{#if event.start_time}
					<div class="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
						<FontAwesomeIcon icon={faClock} class="h-3 w-3" />
						<span>
							{formatTime(event.start_time)}
							{#if event.end_time && event.end_time !== event.start_time}
								- {formatTime(event.end_time)}
							{/if}
						</span>
					</div>
				{/if}
			</div>
		{/if}

		<!-- Price -->
		{#if !event.is_free && event.price !== null && event.price !== undefined}
			<div class="mb-2">
				<div class="flex items-center gap-1.5 text-sm font-semibold text-gray-900 dark:text-white">
					<FontAwesomeIcon icon={faDollarSign} class="h-3 w-3" />
					<span>${formatPrice(event.price)}</span>
				</div>
			</div>
		{:else if event.is_free}
			<div class="mb-2">
				<span
					class="inline-flex items-center gap-1 rounded-full bg-green-500 px-2 py-0.5 text-xs font-semibold text-white"
				>
					<FontAwesomeIcon icon={faTag} class="h-2.5 w-2.5" />
					Free
				</span>
			</div>
		{/if}

		<!-- Tags -->
		{#if event.tags && event.tags.length > 0}
			<div class="mb-2 flex flex-wrap items-center gap-1.5">
				{#each event.tags.slice(0, 3) as tag}
					<span
						class="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
					>
						#{tag}
					</span>
				{/each}
				{#if event.tags.length > 3}
					<span class="text-xs text-gray-500 dark:text-gray-400">+{event.tags.length - 3} more</span
					>
				{/if}
			</div>
		{/if}

		<!-- Category and Location Type -->
		<div class="mb-2 flex flex-wrap items-center gap-2">
			{#if event.category}
				<span
					class="inline-flex items-center gap-1.5 rounded-full bg-purple-50 px-2.5 py-1 text-xs font-medium text-purple-700 ring-1 ring-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:ring-purple-800/50"
				>
					<FontAwesomeIcon icon={faTag} class="h-3 w-3" />
					{event.category}
				</span>
			{/if}
			{#if event.location_type}
				<span
					class="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700 ring-1 ring-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:ring-indigo-800/50"
				>
					<FontAwesomeIcon icon={faMapMarkerAlt} class="h-3 w-3" />
					{event.location_type}
				</span>
			{/if}
			{#if event.age_restriction}
				<span
					class="inline-flex items-center rounded-full bg-orange-50 px-2.5 py-1 text-xs font-medium text-orange-700 ring-1 ring-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:ring-orange-800/50"
				>
					{event.age_restriction}
				</span>
			{/if}
		</div>
	</div>
</div>

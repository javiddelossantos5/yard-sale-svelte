<script lang="ts">
	import { goto } from '$app/navigation';
	import { FontAwesomeIcon } from '@fortawesome/svelte-fontawesome';
	import {
		faBars,
		faUser,
		faArrowRightFromBracket,
		faHome,
		faMessage,
		faHeart,
		faStore,
		faChevronLeft
	} from '@fortawesome/free-solid-svg-icons';
	import { logout } from '$lib/auth';
	import { unreadMessageCount } from '$lib/notifications';
	import type { CurrentUser } from '$lib/api';

	let {
		title,
		subtitle,
		count,
		countLabel,
		showBackButton = false,
		backUrl = '/',
		backLabel = 'Back',
		primaryAction,
		primaryActionLabel,
		primaryActionIcon,
		currentUser,
		marketMessageUnreadCount = 0,
		yardSaleMessageUnreadCount = 0,
		mobileMenuItems = []
	}: {
		title: string;
		subtitle?: string;
		count?: number;
		countLabel?: string;
		showBackButton?: boolean;
		backUrl?: string;
		backLabel?: string;
		primaryAction?: () => void;
		primaryActionLabel?: string;
		primaryActionIcon?: any;
		currentUser: CurrentUser | null;
		marketMessageUnreadCount?: number;
		yardSaleMessageUnreadCount?: number;
		mobileMenuItems?: Array<{
			label: string;
			icon: any;
			action: () => void;
			badge?: number;
		}>;
	} = $props();

	let mobileMenuOpen = $state(false);

	function goToProfile() {
		if (currentUser) goto(`/profile/${currentUser.id}`);
	}

	function handleLogout() {
		logout(); // logout() now handles redirect automatically
	}

	const totalUnreadCount = marketMessageUnreadCount + yardSaleMessageUnreadCount;

	// Development mode indicator (only shows in dev, not production)
	// import.meta.env.DEV is a compile-time constant in Vite
	// Check both DEV flag and MODE to ensure we catch development mode
	const isDev = import.meta.env.DEV === true || import.meta.env.MODE === 'development';

	// Debug logging to help diagnose the issue
	if (typeof window !== 'undefined') {
		const envCheck = {
			DEV: import.meta.env.DEV,
			MODE: import.meta.env.MODE,
			PROD: import.meta.env.PROD,
			computedIsDev: import.meta.env.DEV === true || import.meta.env.MODE === 'development'
		};
		console.log('[AppHeader] Environment check:', envCheck);
	}
</script>

<header
	class="sticky top-0 z-50 border-b border-gray-200/80 bg-white/80 backdrop-blur-xl dark:border-gray-800/80 dark:bg-gray-900/80"
>
	<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
		<!-- Mobile Layout -->
		<div class="block sm:hidden">
			<div class="flex h-16 items-center justify-between">
				<!-- Logo and Title -->
				<div class="flex items-center space-x-3">
					{#if showBackButton}
						<button
							onclick={() => goto(backUrl)}
							class="rounded-full p-1.5 transition hover:bg-gray-100 dark:hover:bg-gray-700"
							aria-label={backLabel}
						>
							<FontAwesomeIcon icon={faChevronLeft} class="h-5 w-5" />
						</button>
					{/if}
					<button
						onclick={() => goto('/')}
						class="rounded-lg transition-opacity hover:opacity-80 active:scale-95"
						aria-label="Go to home"
					>
						<img
							src="/icon2.png"
							alt="Yard Sale Finder Logo"
							class="h-8 w-8 rounded-lg object-cover"
						/>
					</button>
					<div>
						<h1 class="text-lg font-semibold text-gray-900 dark:text-white">{title}</h1>
						{#if subtitle || (count !== undefined && countLabel)}
							<p class="text-xs text-gray-500 dark:text-gray-400">
								{#if subtitle}
									{subtitle}
								{/if}
								{#if count !== undefined && countLabel}
									{#if subtitle}
										•
									{/if}
									{count}
									{countLabel}
								{/if}
							</p>
						{/if}
					</div>
				</div>

				<!-- Right side: Menu button and Primary Action -->
				<div class="flex items-center gap-2">
					{#if isDev}
						<div
							class="flex items-center gap-1.5 rounded-full bg-yellow-500/90 px-2.5 py-1 text-xs font-bold text-white shadow-md backdrop-blur-sm"
							title="Development Mode"
						>
							<span class="relative flex h-2 w-2">
								<span
									class="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75"
								></span>
								<span class="relative inline-flex h-2 w-2 rounded-full bg-white"></span>
							</span>
							<span class="xs:inline hidden">DEV</span>
						</div>
					{/if}
					{#if primaryAction}
						<button
							onclick={primaryAction}
							class="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 transition-all duration-200 hover:from-blue-700 hover:to-blue-800 hover:shadow-xl hover:shadow-blue-500/40 active:scale-95"
						>
							{#if primaryActionIcon}
								<FontAwesomeIcon icon={primaryActionIcon} class="h-4 w-4" />
							{/if}
							{#if primaryActionLabel}
								<span class="xs:inline hidden">{primaryActionLabel}</span>
							{/if}
						</button>
					{/if}

					<!-- Menu Button -->
					<button
						onclick={() => (mobileMenuOpen = !mobileMenuOpen)}
						class="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 transition-all duration-200 hover:bg-gray-200 active:scale-95 dark:bg-gray-800 dark:hover:bg-gray-700"
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
						{#each mobileMenuItems as item}
							<button
								onclick={() => {
									item.action();
									mobileMenuOpen = false;
								}}
								class="relative flex w-full items-center rounded-xl px-4 py-3 text-left text-base font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
							>
								<FontAwesomeIcon
									icon={item.icon}
									class="mr-3 h-5 w-5 text-gray-500 dark:text-gray-400"
								/>
								{item.label}
								{#if item.badge && item.badge > 0}
									<span
										class="ml-auto rounded-full bg-red-500 px-2.5 py-0.5 text-sm font-semibold text-white"
									>
										{item.badge > 99 ? '99+' : item.badge}
									</span>
								{/if}
							</button>
						{/each}
						{#if currentUser}
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
				<div class="flex items-center space-x-4">
					{#if showBackButton}
						<button
							onclick={() => goto(backUrl)}
							class="rounded-full p-2 transition hover:bg-gray-100 dark:hover:bg-gray-700"
							aria-label={backLabel}
						>
							<FontAwesomeIcon icon={faChevronLeft} class="h-5 w-5" />
						</button>
					{/if}
					<button
						onclick={() => goto('/')}
						class="rounded-xl transition-opacity hover:opacity-80 active:scale-95"
						aria-label="Go to home"
					>
						<img
							src="/icon2.png"
							alt="Yard Sale Finder Logo"
							class="h-12 w-12 rounded-xl object-cover shadow-sm"
						/>
					</button>
					<div>
						<h1 class="text-2xl font-bold text-gray-900 dark:text-white">{title}</h1>
						{#if subtitle || (count !== undefined && countLabel)}
							<div class="mt-0.5 flex items-center gap-3">
								{#if subtitle}
									<p class="text-sm text-gray-600 dark:text-gray-400">{subtitle}</p>
								{/if}
								{#if count !== undefined && countLabel}
									<span class="text-xs text-gray-500 dark:text-gray-500">
										{#if subtitle}•
										{/if}
										{count}
										{countLabel}
									</span>
								{/if}
							</div>
						{/if}
					</div>
				</div>

				<!-- Right: Actions -->
				<div class="flex items-center gap-3">
					{#if isDev}
						<div
							class="flex items-center gap-2 rounded-full bg-yellow-500/90 px-3 py-1.5 text-xs font-bold text-white shadow-md backdrop-blur-sm"
							title="Development Mode"
						>
							<span class="relative flex h-2 w-2">
								<span
									class="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75"
								></span>
								<span class="relative inline-flex h-2 w-2 rounded-full bg-white"></span>
							</span>
							<span>DEV</span>
						</div>
					{/if}
					<!-- Secondary Actions -->
					<div class="flex items-center gap-2">
						{#each mobileMenuItems as item}
							<button
								onclick={item.action}
								class="group relative flex items-center gap-2 rounded-xl bg-gray-100/80 px-4 py-2.5 text-sm font-medium text-gray-700 ring-1 ring-gray-200/50 backdrop-blur-sm transition-all duration-200 ring-inset hover:bg-gray-200/90 hover:shadow-md hover:ring-gray-300/50 active:scale-[0.98] dark:bg-gray-800/80 dark:text-gray-200 dark:ring-gray-700/50 dark:hover:bg-gray-700/90 dark:hover:ring-gray-600/50"
							>
								<FontAwesomeIcon
									icon={item.icon}
									class="h-4 w-4 text-gray-600 transition-colors group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-gray-100"
								/>
								<span class="whitespace-nowrap">{item.label}</span>
								{#if item.badge && item.badge > 0}
									<span
										class="ml-1 flex items-center justify-center rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white shadow-sm ring-1 ring-red-600/20"
									>
										{item.badge > 99 ? '99+' : item.badge}
									</span>
								{/if}
							</button>
						{/each}
						{#if currentUser}
							<button
								onclick={goToProfile}
								class="relative flex h-10 w-10 items-center justify-center rounded-full bg-gray-100/80 ring-1 ring-gray-200/50 backdrop-blur-sm transition-all duration-200 ring-inset hover:bg-gray-200/90 hover:shadow-md hover:ring-gray-300/50 active:scale-[0.98] dark:bg-gray-800/80 dark:ring-gray-700/50 dark:hover:bg-gray-700/90 dark:hover:ring-gray-600/50"
								aria-label="My Profile"
							>
								<FontAwesomeIcon icon={faUser} class="h-5 w-5 text-gray-600 dark:text-gray-400" />
								{#if $unreadMessageCount > 0}
									<span
										class="absolute -top-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-red-500 text-xs font-bold text-white shadow-lg ring-1 ring-red-600/20 dark:border-gray-900"
									>
										{$unreadMessageCount > 99 ? '99+' : $unreadMessageCount}
									</span>
								{/if}
							</button>
						{/if}
						<button
							onclick={handleLogout}
							class="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100/80 text-gray-600 ring-1 ring-gray-200/50 backdrop-blur-sm transition-all duration-200 ring-inset hover:bg-gray-200/90 hover:shadow-md hover:ring-gray-300/50 active:scale-[0.98] dark:bg-gray-800/80 dark:text-gray-400 dark:ring-gray-700/50 dark:hover:bg-gray-700/90 dark:hover:ring-gray-600/50"
							aria-label="Logout"
						>
							<FontAwesomeIcon icon={faArrowRightFromBracket} class="h-5 w-5" />
						</button>
					</div>

					<!-- Primary Action -->
					{#if primaryAction}
						<button
							onclick={primaryAction}
							class="group flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 via-blue-600 to-blue-700 px-5 py-2.5 text-sm font-semibold text-white shadow-lg ring-1 shadow-blue-500/25 ring-blue-500/20 transition-all duration-200 ring-inset hover:from-blue-700 hover:via-blue-700 hover:to-blue-800 hover:shadow-xl hover:shadow-blue-500/40 hover:ring-blue-400/30 active:scale-[0.98]"
						>
							{#if primaryActionIcon}
								<FontAwesomeIcon
									icon={primaryActionIcon}
									class="h-4 w-4 transition-transform group-hover:scale-110"
								/>
							{/if}
							{#if primaryActionLabel}
								<span class="whitespace-nowrap">{primaryActionLabel}</span>
							{/if}
						</button>
					{/if}
				</div>
			</div>
		</div>
	</div>
</header>

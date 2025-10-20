<script lang="ts">
	import { goto } from '$app/navigation';
	import { login, register, type LoginRequest, type RegisterRequest } from '$lib/api';

	// Form mode toggle
	let isRegisterMode = $state(false);

	// Login form data
	let username = $state('');
	let password = $state('');

	// Register form data
	let registerData = $state<RegisterRequest>({
		username: '',
		email: '',
		password: '',
		full_name: '',
		phone_number: '',
		location: {
			city: '',
			state: '',
			zip: ''
		},
		bio: ''
	});

	let loading = $state(false);
	let error = $state<string | null>(null);
	let success = $state<string | null>(null);

	// US States for dropdown
	const states = [
		{ code: 'AL', name: 'Alabama' },
		{ code: 'AK', name: 'Alaska' },
		{ code: 'AZ', name: 'Arizona' },
		{ code: 'AR', name: 'Arkansas' },
		{ code: 'CA', name: 'California' },
		{ code: 'CO', name: 'Colorado' },
		{ code: 'CT', name: 'Connecticut' },
		{ code: 'DE', name: 'Delaware' },
		{ code: 'FL', name: 'Florida' },
		{ code: 'GA', name: 'Georgia' },
		{ code: 'HI', name: 'Hawaii' },
		{ code: 'ID', name: 'Idaho' },
		{ code: 'IL', name: 'Illinois' },
		{ code: 'IN', name: 'Indiana' },
		{ code: 'IA', name: 'Iowa' },
		{ code: 'KS', name: 'Kansas' },
		{ code: 'KY', name: 'Kentucky' },
		{ code: 'LA', name: 'Louisiana' },
		{ code: 'ME', name: 'Maine' },
		{ code: 'MD', name: 'Maryland' },
		{ code: 'MA', name: 'Massachusetts' },
		{ code: 'MI', name: 'Michigan' },
		{ code: 'MN', name: 'Minnesota' },
		{ code: 'MS', name: 'Mississippi' },
		{ code: 'MO', name: 'Missouri' },
		{ code: 'MT', name: 'Montana' },
		{ code: 'NE', name: 'Nebraska' },
		{ code: 'NV', name: 'Nevada' },
		{ code: 'NH', name: 'New Hampshire' },
		{ code: 'NJ', name: 'New Jersey' },
		{ code: 'NM', name: 'New Mexico' },
		{ code: 'NY', name: 'New York' },
		{ code: 'NC', name: 'North Carolina' },
		{ code: 'ND', name: 'North Dakota' },
		{ code: 'OH', name: 'Ohio' },
		{ code: 'OK', name: 'Oklahoma' },
		{ code: 'OR', name: 'Oregon' },
		{ code: 'PA', name: 'Pennsylvania' },
		{ code: 'RI', name: 'Rhode Island' },
		{ code: 'SC', name: 'South Carolina' },
		{ code: 'SD', name: 'South Dakota' },
		{ code: 'TN', name: 'Tennessee' },
		{ code: 'TX', name: 'Texas' },
		{ code: 'UT', name: 'Utah' },
		{ code: 'VT', name: 'Vermont' },
		{ code: 'VA', name: 'Virginia' },
		{ code: 'WA', name: 'Washington' },
		{ code: 'WV', name: 'West Virginia' },
		{ code: 'WI', name: 'Wisconsin' },
		{ code: 'WY', name: 'Wyoming' }
	];

	async function handleLogin(event: Event) {
		event.preventDefault();

		if (!username.trim() || !password.trim()) {
			error = 'Please enter both username and password';
			return;
		}

		loading = true;
		error = null;
		success = null;

		try {
			const credentials: LoginRequest = {
				username: username.trim(),
				password: password.trim()
			};

			const response = await login(credentials);

			// Store the token
			localStorage.setItem('access_token', response.access_token);

			// Redirect to main page
			goto('/');
		} catch (err) {
			error = err instanceof Error ? err.message : 'Login failed. Please try again.';
		} finally {
			loading = false;
		}
	}

	async function handleRegister(event: Event) {
		event.preventDefault();

		// Basic validation
		if (
			!registerData.username.trim() ||
			!registerData.email.trim() ||
			!registerData.password.trim() ||
			!registerData.full_name.trim() ||
			!registerData.phone_number.trim() ||
			!registerData.location.city.trim() ||
			!registerData.location.state.trim() ||
			!registerData.location.zip.trim()
		) {
			error = 'Please fill in all required fields';
			return;
		}

		// Email validation
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(registerData.email)) {
			error = 'Please enter a valid email address';
			return;
		}

		loading = true;
		error = null;
		success = null;

		try {
			const response = await register(registerData);
			success = response.message || 'Registration successful! You can now login.';

			// Switch to login mode after successful registration
			setTimeout(() => {
				isRegisterMode = false;
				success = null;
			}, 3000);
		} catch (err) {
			error = err instanceof Error ? err.message : 'Registration failed. Please try again.';
		} finally {
			loading = false;
		}
	}

	function toggleMode() {
		isRegisterMode = !isRegisterMode;
		error = null;
		success = null;
		// Clear form data when switching modes
		username = '';
		password = '';
		registerData = {
			username: '',
			email: '',
			password: '',
			full_name: '',
			phone_number: '',
			location: {
				city: '',
				state: '',
				zip: ''
			},
			bio: ''
		};
	}
</script>

<svelte:head>
	<title>Login - Yard Sale Finder</title>
	<meta name="description" content="Login to Yard Sale Finder" />
</svelte:head>

<div
	class="flex min-h-screen flex-col justify-center bg-gray-50 py-12 sm:px-6 lg:px-8 dark:bg-gray-900"
>
	<div class="sm:mx-auto sm:w-full sm:max-w-md">
		<div class="text-center">
			<h1 class="mb-2 text-4xl font-bold text-gray-900 dark:text-white">🏠</h1>
			<h2 class="text-3xl font-bold text-gray-900 dark:text-white">Yard Sale Finder</h2>
			<p class="mt-2 text-sm text-gray-600 dark:text-gray-300">
				{isRegisterMode ? 'Create your account' : 'Sign in to your account'}
			</p>
		</div>
	</div>

	<div class="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
		<div
			class="bg-white px-4 py-8 shadow sm:rounded-lg sm:px-10 dark:bg-gray-800 dark:shadow-none dark:ring-1 dark:ring-gray-700"
		>
			{#if !isRegisterMode}
				<!-- Login Form -->
				<form class="space-y-6" onsubmit={handleLogin}>
					<!-- Username Field -->
					<div>
						<label
							for="username"
							class="block text-sm font-medium text-gray-700 dark:text-gray-300"
						>
							Username
						</label>
						<div class="mt-1">
							<input
								id="username"
								name="username"
								type="text"
								autocomplete="username"
								required
								bind:value={username}
								class="block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500 focus:outline-none sm:text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-blue-400 dark:focus:ring-blue-400"
								placeholder="Enter your username"
								disabled={loading}
							/>
						</div>
					</div>

					<!-- Password Field -->
					<div>
						<label
							for="password"
							class="block text-sm font-medium text-gray-700 dark:text-gray-300"
						>
							Password
						</label>
						<div class="mt-1">
							<input
								id="password"
								name="password"
								type="password"
								autocomplete="current-password"
								required
								bind:value={password}
								class="block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500 focus:outline-none sm:text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-blue-400 dark:focus:ring-blue-400"
								placeholder="Enter your password"
								disabled={loading}
							/>
						</div>
					</div>

					<!-- Error Message -->
					{#if error}
						<div
							class="rounded-md bg-red-50 p-4 dark:border dark:border-red-800 dark:bg-red-900/20"
						>
							<div class="flex">
								<div class="shrink-0">
									<svg
										class="h-5 w-5 text-red-400"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
										></path>
									</svg>
								</div>
								<div class="ml-3">
									<h3 class="text-sm font-medium text-red-800 dark:text-red-200">Login Error</h3>
									<div class="mt-2 text-sm text-red-700 dark:text-red-300">
										<p>{error}</p>
									</div>
								</div>
							</div>
						</div>
					{/if}

					<!-- Submit Button -->
					<div>
						<button
							type="submit"
							disabled={loading}
							class="group relative flex w-full justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
						>
							{#if loading}
								<svg
									class="mr-3 -ml-1 h-5 w-5 animate-spin text-white"
									fill="none"
									viewBox="0 0 24 24"
								>
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
								Signing in...
							{:else}
								<svg class="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
									></path>
								</svg>
								Sign in
							{/if}
						</button>
					</div>
				</form>

				<!-- Toggle Button -->
				<div class="mt-6">
					<div class="relative">
						<div class="absolute inset-0 flex items-center">
							<div class="w-full border-t border-gray-300 dark:border-gray-600"></div>
						</div>
						<div class="relative flex justify-center text-sm">
							<button
								type="button"
								onclick={toggleMode}
								class="bg-white px-4 py-2 text-blue-600 hover:text-blue-500 dark:bg-gray-800 dark:text-blue-400 dark:hover:text-blue-300"
							>
								Don't have an account? Sign up
							</button>
						</div>
					</div>
				</div>
			{:else}
				<!-- Registration Form -->
				<form class="space-y-6" onsubmit={handleRegister}>
					<!-- Username Field -->
					<div>
						<label
							for="reg-username"
							class="block text-sm font-medium text-gray-700 dark:text-gray-300"
						>
							Username *
						</label>
						<div class="mt-1">
							<input
								id="reg-username"
								name="username"
								type="text"
								autocomplete="username"
								required
								bind:value={registerData.username}
								class="block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500 focus:outline-none sm:text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-blue-400 dark:focus:ring-blue-400"
								placeholder="Enter your username"
								disabled={loading}
							/>
						</div>
					</div>

					<!-- Email Field -->
					<div>
						<label
							for="reg-email"
							class="block text-sm font-medium text-gray-700 dark:text-gray-300"
						>
							Email *
						</label>
						<div class="mt-1">
							<input
								id="reg-email"
								name="email"
								type="email"
								autocomplete="email"
								required
								bind:value={registerData.email}
								class="block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500 focus:outline-none sm:text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-blue-400 dark:focus:ring-blue-400"
								placeholder="Enter your email"
								disabled={loading}
							/>
						</div>
					</div>

					<!-- Password Field -->
					<div>
						<label
							for="reg-password"
							class="block text-sm font-medium text-gray-700 dark:text-gray-300"
						>
							Password *
						</label>
						<div class="mt-1">
							<input
								id="reg-password"
								name="password"
								type="password"
								autocomplete="new-password"
								required
								bind:value={registerData.password}
								class="block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500 focus:outline-none sm:text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-blue-400 dark:focus:ring-blue-400"
								placeholder="Enter your password"
								disabled={loading}
							/>
						</div>
					</div>

					<!-- Full Name Field -->
					<div>
						<label
							for="reg-fullname"
							class="block text-sm font-medium text-gray-700 dark:text-gray-300"
						>
							Full Name *
						</label>
						<div class="mt-1">
							<input
								id="reg-fullname"
								name="full_name"
								type="text"
								autocomplete="name"
								required
								bind:value={registerData.full_name}
								class="block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500 focus:outline-none sm:text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-blue-400 dark:focus:ring-blue-400"
								placeholder="Enter your full name"
								disabled={loading}
							/>
						</div>
					</div>

					<!-- Phone Number Field -->
					<div>
						<label
							for="reg-phone"
							class="block text-sm font-medium text-gray-700 dark:text-gray-300"
						>
							Phone Number *
						</label>
						<div class="mt-1">
							<input
								id="reg-phone"
								name="phone_number"
								type="tel"
								autocomplete="tel"
								required
								bind:value={registerData.phone_number}
								class="block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500 focus:outline-none sm:text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-blue-400 dark:focus:ring-blue-400"
								placeholder="Enter your phone number"
								disabled={loading}
							/>
						</div>
					</div>

					<!-- Location Fields -->
					<div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
						<div>
							<label
								for="reg-city"
								class="block text-sm font-medium text-gray-700 dark:text-gray-300"
							>
								City *
							</label>
							<div class="mt-1">
								<input
									id="reg-city"
									name="city"
									type="text"
									required
									bind:value={registerData.location.city}
									class="block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500 focus:outline-none sm:text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-blue-400 dark:focus:ring-blue-400"
									placeholder="City"
									disabled={loading}
								/>
							</div>
						</div>
						<div>
							<label
								for="reg-state"
								class="block text-sm font-medium text-gray-700 dark:text-gray-300"
							>
								State *
							</label>
							<div class="mt-1">
								<select
									id="reg-state"
									name="state"
									required
									bind:value={registerData.location.state}
									class="block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500 focus:outline-none sm:text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-blue-400 dark:focus:ring-blue-400"
									disabled={loading}
								>
									<option value="">Select State</option>
									{#each states as state}
										<option value={state.code}>{state.name}</option>
									{/each}
								</select>
							</div>
						</div>
						<div>
							<label
								for="reg-zip"
								class="block text-sm font-medium text-gray-700 dark:text-gray-300"
							>
								ZIP *
							</label>
							<div class="mt-1">
								<input
									id="reg-zip"
									name="zip"
									type="text"
									required
									bind:value={registerData.location.zip}
									class="block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500 focus:outline-none sm:text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-blue-400 dark:focus:ring-blue-400"
									placeholder="ZIP"
									disabled={loading}
								/>
							</div>
						</div>
					</div>

					<!-- Bio Field -->
					<div>
						<label for="reg-bio" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
							Bio
						</label>
						<div class="mt-1">
							<textarea
								id="reg-bio"
								name="bio"
								rows="3"
								bind:value={registerData.bio}
								class="block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500 focus:outline-none sm:text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-blue-400 dark:focus:ring-blue-400"
								placeholder="Tell us about yourself (optional)"
								disabled={loading}
							></textarea>
						</div>
					</div>

					<!-- Error Message -->
					{#if error}
						<div
							class="rounded-md bg-red-50 p-4 dark:border dark:border-red-800 dark:bg-red-900/20"
						>
							<div class="flex">
								<div class="shrink-0">
									<svg
										class="h-5 w-5 text-red-400"
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
								</div>
								<div class="ml-3">
									<h3 class="text-sm font-medium text-red-800 dark:text-red-200">Error</h3>
									<div class="mt-2 text-sm text-red-700 dark:text-red-300">
										<p>{error}</p>
									</div>
								</div>
							</div>
						</div>
					{/if}

					<!-- Success Message -->
					{#if success}
						<div
							class="rounded-md bg-green-50 p-4 dark:border dark:border-green-800 dark:bg-green-900/20"
						>
							<div class="flex">
								<div class="shrink-0">
									<svg
										class="h-5 w-5 text-green-400"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
										/>
									</svg>
								</div>
								<div class="ml-3">
									<h3 class="text-sm font-medium text-green-800 dark:text-green-200">Success</h3>
									<div class="mt-2 text-sm text-green-700 dark:text-green-300">
										<p>{success}</p>
									</div>
								</div>
							</div>
						</div>
					{/if}

					<!-- Submit Button -->
					<div>
						<button
							type="submit"
							disabled={loading}
							class="flex w-full justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:focus:ring-offset-gray-800"
						>
							{#if loading}
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
								Creating account...
							{:else}
								<svg class="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
									/>
								</svg>
								Create Account
							{/if}
						</button>
					</div>
				</form>

				<!-- Toggle Button -->
				<div class="mt-6">
					<div class="relative">
						<div class="absolute inset-0 flex items-center">
							<div class="w-full border-t border-gray-300 dark:border-gray-600"></div>
						</div>
						<div class="relative flex justify-center text-sm">
							<button
								type="button"
								onclick={toggleMode}
								class="bg-white px-4 py-2 text-blue-600 hover:text-blue-500 dark:bg-gray-800 dark:text-blue-400 dark:hover:text-blue-300"
							>
								Already have an account? Sign in
							</button>
						</div>
					</div>
				</div>
			{/if}
		</div>
	</div>
</div>

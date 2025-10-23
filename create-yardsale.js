// Using built-in fetch (Node.js 18+)

async function createYardSale() {
	try {
		// First, login to get the token
		console.log('Logging in...');
		const loginResponse = await fetch('http://localhost:8000/api/login', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				username: 'javiddelossantos',
				password: 'Password'
			})
		});

		if (!loginResponse.ok) {
			throw new Error(`Login failed: ${loginResponse.status} ${loginResponse.statusText}`);
		}

		const loginData = await loginResponse.json();
		console.log('Login successful!');
		console.log('Token:', loginData.access_token);

		// Create a yard sale
		console.log('Creating yard sale...');
		const tomorrow = new Date();
		tomorrow.setDate(tomorrow.getDate() + 1);
		tomorrow.setHours(0, 0, 0, 0); // Set to start of day

		const dayAfterTomorrow = new Date();
		dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);
		dayAfterTomorrow.setHours(0, 0, 0, 0); // Set to start of day

		const yardSaleData = {
			title: 'Test Yard Sale - ' + new Date().toISOString(),
			description: 'This is a test yard sale created by script',
			address: '123 Main St',
			city: 'Vernal',
			state: 'UT',
			zip_code: '84078',
			start_date: tomorrow.toISOString().split('T')[0], // YYYY-MM-DD format
			end_date: dayAfterTomorrow.toISOString().split('T')[0], // YYYY-MM-DD format
			start_time: '09:00:00',
			end_time: '17:00:00',
			categories: ['furniture', 'electronics'],
			payment_methods: ['cash', 'venmo'],
			venmo_url: 'https://venmo.com/test',
			allow_messages: true,
			contact_name: 'Javid De Los Santos'
		};

		const createResponse = await fetch('http://localhost:8000/yard-sales', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${loginData.access_token}`
			},
			body: JSON.stringify(yardSaleData)
		});

		if (!createResponse.ok) {
			const errorText = await createResponse.text();
			throw new Error(
				`Create yard sale failed: ${createResponse.status} ${createResponse.statusText} - ${errorText}`
			);
		}

		const yardSale = await createResponse.json();
		console.log('Yard sale created successfully!');
		console.log('Yard Sale ID:', yardSale.id);
		console.log('Title:', yardSale.title);
		console.log('Address:', yardSale.address);
		console.log('Start Date:', yardSale.start_date);
		console.log('End Date:', yardSale.end_date);
	} catch (error) {
		console.error('Error:', error.message);
	}
}

createYardSale();

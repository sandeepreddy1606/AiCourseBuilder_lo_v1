async function testRegister() {
    const url = 'http://localhost:5000/auth/register';
    const body = {
        email: `test_user_${Date.now()}@example.com`,
        password: 'password123',
        full_name: 'Test User'
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        const data = await response.json();
        console.log('Status Code:', response.status);
        console.log('Response Body:', data);
    } catch (error) {
        console.error('Fetch error:', error);
    }
}

testRegister();

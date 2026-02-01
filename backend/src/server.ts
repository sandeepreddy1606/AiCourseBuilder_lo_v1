import app from './app';
import dotenv from 'dotenv';
import pool from './config/db';

dotenv.config();

const PORT = process.env.PORT || 5000;

// Test DB connection
pool.query('SELECT NOW()', (err, res) => {
    if (err) {
        console.error('Error connecting to database', err);
    } else {
        console.log('Database connected successfully');

        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    }
});

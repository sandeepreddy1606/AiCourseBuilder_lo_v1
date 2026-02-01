import app from './app';
import dotenv from 'dotenv';
import pool from './config/db';
import { Server } from 'http';
import { killPort } from './utils/killPort';

dotenv.config();

const PORT = parseInt(process.env.PORT || '5000', 10);

const startServer = async () => {
    try {
        // 0. Force kill any process on this port (Permanent Fix)
        // This prevents EADDRINUSE errors by ensuring the port is free before we start.
        await killPort(PORT);

        // 1. Test Database Connection
        await pool.query('SELECT NOW()');
        console.log('✅ Database connected successfully');

        // 2. Start Server
        const server: Server = app.listen(PORT, () => {
            console.log(`🚀 Server running on port ${PORT}`);
        });

        // 3. Handle Server Errors
        server.on('error', (error: any) => {
            if (error.code === 'EADDRINUSE') {
                console.error(`❌ Port ${PORT} is already in use.`);
                console.error('   Please close the process using this port or change PORT in .env');
                process.exit(1);
            } else {
                console.error('❌ Server error:', error);
                process.exit(1);
            }
        });

        // 4. Graceful Shutdown
        const shutdown = () => {
            console.log('\n🛑 Shutting down server...');
            server.close(() => {
                pool.end(() => {
                    console.log('   Database connection closed.');
                    process.exit(0);
                });
            });
        };

        process.on('SIGTERM', shutdown);
        process.on('SIGINT', shutdown);

    } catch (err) {
        console.error('❌ Failed to connect to database:', err);
        process.exit(1); // Exit with error code so nodemon knows it failed
    }
};

startServer();

// Global Error Handlers
process.on('uncaughtException', (err) => {
    console.error('❌ Uncaught Exception:', err);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

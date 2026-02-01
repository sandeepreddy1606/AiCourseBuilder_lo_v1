import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export const killPort = async (port: number) => {
    try {
        const platform = process.platform;
        if (platform === 'win32') {
            const { stdout } = await execAsync(`netstat -ano | findstr :${port}`);
            if (stdout) {
                const lines = stdout.trim().split('\n');
                for (const line of lines) {
                    const parts = line.trim().split(/\s+/);
                    const pid = parts[parts.length - 1]; // PID is the last column
                    if (parseInt(pid) > 0) { // Avoid killing PID 0
                        try {
                            await execAsync(`taskkill /PID ${pid} /F`);
                            console.log(`✅ Killed process ${pid} occupying port ${port}`);
                        } catch (e) {
                            // Ignore error if process already gone
                        }
                    }
                }
            }
        } else {
            // For Linux/Mac (lsof)
            await execAsync(`lsof -i :${port} | grep LISTEN | awk '{print $2}' | xargs kill -9`);
        }
    } catch (error) {
        // If no process is found or command fails, it's fine, just proceed
        // console.log(`No process found on port ${port} or failed to kill.`);
    }
    // Wait a brief moment for OS to release the port
    await new Promise(resolve => setTimeout(resolve, 1000));
};

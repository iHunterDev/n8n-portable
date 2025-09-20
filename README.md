# n8n Portable Edition 
 
This is a portable version of n8n that runs without installation on Windows. 

## Quick Start 
 
1. Double-click `scripts/start.bat` to start n8n 
2. Open your browser and go to http://localhost:5678 
3. Create your first workflow! 
 
## Scripts 
 
- `scripts/start.bat` - Start n8n 
- `scripts/stop.bat` - Stop n8n 
- `scripts/backup.bat` - Create backup of your data 
- `scripts/install-n8n.bat` - Install n8n to the portable environment
- `scripts/download-nodejs.bat` - Download Node.js runtime
- `scripts/load-env.bat` - Load environment variables from config 
 
## Configuration 
 
Edit `config/.env` to customize settings like: 
- Port number (N8N_PORT) 
- Host address (N8N_HOST) 
- Database location (DB_SQLITE_DATABASE) 
 
## Data Storage 
 
All your data is stored in the `data/` folder: 
- Workflows: `data/workflows/` 
- Credentials: `data/credentials/` 
- Database: `data/database/` 
- Logs: `data/logs/` 
 
## Backup 
 
Run `scripts/backup.bat` to create a timestamped backup of all your data. 

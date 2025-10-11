# n8n Portable Edition

[![Version](https://img.shields.io/badge/n8n-v1.111.1-blue.svg)](https://n8n.io/)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20Linux%20%7C%20macOS-green.svg)](#platform-support)
[![License](https://img.shields.io/badge/license-MIT-orange.svg)](LICENSE)
[![GitHub](https://img.shields.io/badge/github-iHunterDev%2Fn8n--portable-black.svg)](https://github.com/iHunterDev/n8n-portable)

A portable, zero-installation version of [n8n](https://n8n.io/) that runs completely self-contained without requiring system-wide installation. Perfect for development, testing, or running n8n in isolated environments.

**🔗 Repository**: https://github.com/iHunterDev/n8n-portable

## ✨ Features

- **Zero Installation**: No system-wide dependencies required
- **Portable**: Self-contained with embedded Node.js runtime
- **Cross-Platform**: Windows, Linux & macOS (all ready)
- **Isolated Environment**: All data stored in project directory
- **Easy Backup**: One-click data backup and restore
- **Configurable**: Comprehensive environment configuration
- **Secure**: Runs locally with no external dependencies

## 🚀 Quick Start

### Windows
1. Download and extract the portable edition
2. Double-click `scripts/start.cmd` to start n8n
3. Open your browser and go to http://localhost:5678
4. Create your first workflow!

### Linux & macOS
1. Download and extract the portable edition
2. Run `chmod +x scripts/*.sh` to make scripts executable
3. Run `./scripts/start.sh` to start n8n
4. Open your browser and go to http://localhost:5678
5. Create your first workflow!

### Prerequisites
- Windows 10/11 (x64 or ARM64)
- Linux (Ubuntu, CentOS, Debian) (x64, ARM64)
- macOS (Intel & Apple Silicon) (x64, ARM64)
- 4GB RAM minimum (8GB recommended)
- 2GB free disk space

## 📁 Project Structure

```
n8n-portable/
├── bin/              # Node.js runtime (auto-downloaded)
├── config/           # Configuration files
│   └── .env         # Main configuration
├── data/            # All user data (workflows, credentials, database)
│   ├── database/    # SQLite database
│   ├── binary-data/ # File uploads and binary data
│   └── logs/        # Application logs
├── lib/             # n8n installation and dependencies
├── scripts/         # Platform-specific scripts
│   ├── js/          # Core JavaScript modules
│   ├── *.cmd        # Windows batch scripts
│   ├── linux/       # Linux shell scripts (planned)
│   └── macos/       # macOS shell scripts (planned)
└── temp/            # Temporary files and npm cache
```

## 🛠 Installation

### Method 1: Ready-to-Run (Recommended)
1. Download the latest release
2. Extract to your preferred location
3. Run the appropriate script for your platform:
   - Windows: `scripts/start.cmd`
   - Linux/macOS: `./scripts/start.sh`

### Method 2: Manual Setup
1. Clone this repository
2. Run the appropriate download script for your platform:
   - Windows: `scripts/download-nodejs.cmd`
   - Linux/macOS: `./scripts/download-nodejs.sh`
3. Run `scripts/install-n8n.cmd` (Windows) or `./scripts/install-n8n.sh` (Linux/macOS) to install n8n
4. Run `scripts/start.cmd` (Windows) or `./scripts/start.sh` (Linux/macOS) to start

## 📜 Available Scripts

### Windows Scripts
- **`start.cmd`** - Start n8n server
- **`stop.cmd`** - Stop n8n server
- **`download-nodejs.cmd`** - Download Node.js runtime

### Linux & macOS Scripts
- **`start.sh`** - Start n8n server
- **`stop.sh`** - Stop n8n server
- **`download-nodejs.sh`** - Download Node.js runtime

### Advanced Scripts
All scripts use the modular JavaScript system in `scripts/js/`:
- **`install-n8n.js`** - Core n8n installation logic
- **`install-nodes.js`** - Install additional n8n community nodes
- **`start.js`** - Server startup with environment loading
- **`stop.js`** - Graceful server shutdown
- **`load-env.js`** - Environment variable management

## ⚙️ Configuration

### Basic Configuration (`config/.env`)

```bash
# Server Settings
N8N_HOST=localhost
N8N_PORT=5678
N8N_PROTOCOL=http

# Data Storage
N8N_USER_FOLDER=./data
DB_TYPE=sqlite
DB_SQLITE_DATABASE=./data/database/n8n.sqlite

# Security
N8N_ENCRYPTION_KEY=change-this-in-production
N8N_SECURE_COOKIE=false

# Logging
N8N_LOG_LEVEL=info
N8N_LOG_OUTPUT=file
N8N_LOG_FILE_LOCATION=./data/logs
```

### Advanced Configuration
The `.env` file supports all n8n environment variables:
- **Performance**: Database pool size, binary data TTL
- **Security**: Encryption keys, cookie settings
- **Features**: Task runners, diagnostics, webhooks
- **Email**: SMTP configuration for workflow testing

## 💾 Data Management

### Data Storage
All user data is stored in the `data/` directory:
- **Workflows**: Stored in SQLite database (`data/database/`)
- **Credentials**: Encrypted and stored in database
- **Binary Data**: Files uploaded in workflows (`data/binary-data/`)
- **Logs**: Application and error logs (`data/logs/`)

### Backup & Restore
*Backup and restore functionality is currently under development and not yet implemented.*

Manual backup process:
1. **Stop n8n server** before creating backup
2. **Copy the entire `data/` directory** to a safe location
3. **To restore**:
   - Stop n8n server
   - Replace the `data/` directory with your backup
   - Restart n8n server

*Note: Automated backup scripts will be available in a future release.*

## 🔧 Development

### Architecture
The project uses a modular JavaScript architecture:
- **Platform Detection**: Automatic OS/architecture detection
- **Process Management**: Cross-platform process handling
- **Environment Loading**: Secure configuration management
- **Utility Functions**: Shared functionality across scripts

### Key Modules
- **`utils/platform.js`** - Platform detection and paths
- **`utils/process.js`** - Process spawning and management
- **`utils/env.js`** - Environment variable handling
- **`utils/download.js`** - File download utilities

### Adding Custom Nodes
```cmd
# Install community nodes
scripts/install-nodes.cmd @n8n/n8n-nodes-github
```

## 🌐 Platform Support

| Platform | Status | Architecture | Notes |
|----------|--------|--------------|-------|
| Windows 10/11 | ✅ Ready | x64, ARM64 | Fully functional |
| Linux | ✅ Ready | x64, ARM64 | Ubuntu, CentOS, Debian |
| macOS | ✅ Ready | x64, Apple Silicon | Intel & M1/M2 support |

## 🚨 Troubleshooting

### Common Issues

**Port Already in Use**
```cmd
# Change port in config/.env
N8N_PORT=5679
```

**Permission Errors**
- Run as Administrator (Windows)
- Ensure write permissions to project directory

**Node.js Runtime Missing**
```cmd
# Windows
scripts/download-nodejs.cmd

# Linux/macOS
./scripts/download-nodejs.sh
```

**Database Corruption**
```cmd
# Restore from backup or delete data/database/ to reset
```

### Log Files
Check `data/logs/` for detailed error information.

## 🤝 Contributing

We welcome contributions! Please see our contributing guidelines:

1. **Issues**: Report bugs or request features
2. **Pull Requests**: Submit improvements or new features
3. **Documentation**: Help improve this README or add examples
4. **Testing**: Test on different platforms and configurations

### Development Setup
1. Fork the repository
2. Clone your fork
3. Create a feature branch
4. Make your changes
5. Test thoroughly
6. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [n8n](https://n8n.io/) - The amazing workflow automation platform
- [Node.js](https://nodejs.org/) - JavaScript runtime
- Community contributors and testers

## 📞 Support

- **Issues**: [GitHub Issues](../../issues)
- **Discussions**: [GitHub Discussions](../../discussions)
- **n8n Community**: [n8n Community Forum](https://community.n8n.io/)

---

**Note**: This is an unofficial portable distribution of n8n. For official n8n support and documentation, visit [n8n.io](https://n8n.io/).
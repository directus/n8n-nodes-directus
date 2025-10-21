# n8n-nodes-directus

A comprehensive n8n community node package for integrating with Directus CMS.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/reference/license/) workflow automation platform.

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation.

### Package Name

The package is published as `@directus/n8n-nodes-directus` on npm.

### From npm (when published)

```bash
npm install @directus/n8n-nodes-directus
```

**Note**: This package is not yet published to npm. For development and testing, see the [Development](#development) section below.

## Usage

### Getting Started

1. **Install the package** (when published):

   ```bash
   npm install @directus/n8n-nodes-directus
   ```

2. **Configure credentials** in n8n:
   - Add your Directus URL (e.g., `https://your-directus.app`)
   - Add your Directus API token with appropriate permissions

3. **Use the nodes** in your workflows:
   - **Directus Node**: For CRUD operations on items, users, and files
   - **Directus Trigger Node**: For webhook-based automation

### Available Operations

#### Directus Node

- **Items**: Create, Read, Update, Delete, Get All items in collections
- **Users**: Invite, Update, Delete, Get, Get All users with Simplify option
- **Files**: Upload, Update, Delete, Get, Get All files with Simplify option
- **Raw JSON Operations**: Create/Update with raw JSON data for advanced use cases

#### Directus Trigger Node

- **Item Events**: Trigger on create, update, delete operations in collections
- **User Events**: Trigger on user creation, updates, and deletions
- **File Events**: Trigger on file uploads and updates

## Features

- **Dynamic Field Loading**: Automatically loads available collections and fields from your Directus instance
- **Smart Field Processing**: Handles complex field types and relationships
- **Simplify Option**: Returns essential fields only for Users and Files "Get All" operations
- **Robust Error Handling**: Comprehensive error handling with detailed error messages
- **Webhook Management**: Automatic webhook creation and cleanup for trigger nodes
- **Type Safety**: Full TypeScript support with proper type definitions
- **UX Compliance**: Follows n8n community node UX guidelines with proper naming and placeholders

## Credentials

### Directus API

Configure your Directus instance connection:

- **Directus URL**: Your Directus instance URL (e.g., `https://your-directus.app`)
- **Token**: Your Directus API token with appropriate permissions

## Compatibility

- **Directus Cloud**: Fully supported
- **Self-hosted Directus**: Fully supported
- **Directus Versions**: Compatible with Directus 10.0+

## Development

This project uses the official n8n-node CLI tool for development and follows n8n community node standards.

### Prerequisites

- **Node.js 20+**
- **npm or yarn**
- **Directus instance** for testing (cloud or self-hosted)
- **ngrok** (for webhook testing) - install from [ngrok.com](https://ngrok.com/)

### Setup

```bash
# Clone the repository
git clone https://github.com/directus/n8n-nodes-directus.git
cd n8n-nodes-directus

# Install dependencies
npm install

# Build the project
npm run build
```

### Quick Start

1. **Start n8n with your node loaded**:

   ```bash
   npm run dev:n8n
   ```

   This will:
   - Link your custom node to n8n
   - Start n8n development server
   - Make your Directus nodes available in n8n

2. **Access n8n**: Open http://localhost:5678 in your browser

3. **Configure credentials**:
   - Add your Directus API credentials
   - Test the connection

4. **Create workflows**: Use the Directus nodes in your workflows

### Project Structure

```
├── credentials/           # Directus API credentials
├── nodes/               # n8n nodes (Directus and DirectusTrigger)
├── src/                 # Shared utilities and helpers
├── __tests__/           # Test files
├── dist/                # Built/compiled files (generated)
└── package.json         # Package configuration
```

### Available Commands

```bash
# Development
npm run build         # Build the project (TypeScript compilation + assets)
npm run dev           # Watch mode for TypeScript compilation
npm run dev:n8n       # Start n8n with your node loaded for testing
npm run build:n8n    # Build nodes and credentials using n8n-node CLI

# Code Quality
npm run lint          # Check code style (nodes, credentials, package.json)
npm run lintfix       # Fix code style issues (nodes, credentials, package.json)
npm run lint:n8n      # Check code style using n8n-node CLI
npm run lintfix:n8n  # Fix code style issues using n8n-node CLI
npm run format        # Format code using Prettier

# Testing
npm run test          # Run test suite
npm run test:watch    # Run tests in watch mode
npm run test:coverage # Run tests with coverage report

# Publishing
npm run release       # Publish to npm using n8n-node CLI
```

### Testing

#### Basic Node Testing

1. **Start n8n with your node loaded**:

   ```bash
   npm run dev:n8n
   ```

2. **Access n8n**: Open http://localhost:5678 in your browser

3. **Configure credentials**:
   - Go to **Credentials** → **Add Credential**
   - Search for "Directus API" and add your credentials
   - Test the connection

4. **Test operations**:
   - Create a new workflow
   - Add a Directus node
   - Test various operations (Create, Read, Update, Delete)

#### Webhook Testing (Requires ngrok)

For testing the **Directus Trigger** node, you need to expose n8n via a public URL since Directus cannot reach localhost:

1. **Install ngrok** (if not already installed):

   ```bash
   # macOS with Homebrew
   brew install ngrok

   # Or download from https://ngrok.com/
   ```

2. **Start n8n** (in one terminal):

   ```bash
   npm run dev:n8n
   ```

3. **Start ngrok** (in another terminal):

   ```bash
   ngrok http 5678
   ```

   This will give you a public URL like `https://abc123.ngrok-free.dev`

4. **Create a webhook workflow**:
   - Add a **Directus Trigger** node
   - Configure the trigger (resource, event, collection)
   - Activate the workflow
   - Copy the webhook URL from n8n

5. **Update Directus webhook**:
   - In Directus, go to **Settings → Flows**
   - Find the created flow and edit it
   - Replace `localhost:5678` with your ngrok URL
   - Save the flow

6. **Test the webhook**:
   - Create/update items in Directus
   - Check if the webhook triggers in n8n

**Note**: The manual URL replacement step is required because Directus cannot reach localhost URLs directly.

### Troubleshooting

#### Common Issues

1. **n8n not starting**:
   - Ensure Node.js 20+ is installed
   - Run `npm install` to install dependencies
   - Check if port 5678 is available

2. **Node not appearing in n8n**:
   - Run `npm run build` first
   - Restart `npm run dev:n8n`
   - Check the terminal for any error messages

3. **Webhook not triggering**:
   - Ensure ngrok is running and accessible
   - Verify the webhook URL in Directus flows
   - Check n8n workflow is activated
   - Test the ngrok URL directly in browser

4. **Build errors**:
   - Run `npm run lint` to check for code issues
   - Run `npm run lintfix` to auto-fix issues
   - Ensure TypeScript compilation passes

#### Getting Help

- Check the [GitHub Issues](https://github.com/directus/n8n-nodes-directus/issues) for known problems
- Run `npm run test` to verify everything works
- Use `npm run test:coverage` to see test coverage

## Contributing

We welcome feedback and suggestions! Please help us improve this community node:

### Reporting Issues

- **Bug Reports**: Use the [GitHub Issues](https://github.com/directus/n8n-nodes-directus/issues) page to report bugs
- **Feature Requests**: Submit enhancement ideas through GitHub Issues
- **Documentation**: Help improve our documentation by reporting unclear sections

### Issue Guidelines

When reporting issues, please provide:

- Detailed description of the problem or feature request
- Steps to reproduce (for bugs)
- Expected vs actual behavior
- Your Directus version and n8n version
- Any relevant error messages or logs

### Code Contributions

While we appreciate community interest, we maintain this node internally to ensure:

- Consistent code quality and style
- Proper testing and validation
- Alignment with Directus and n8n best practices
- Timely maintenance and updates

If you have specific code improvements or bug fixes, please:

1. **Open an issue first** describing the problem or improvement
2. **Wait for our team to review** and potentially implement the change
3. **Provide detailed information** to help us understand the requirement

This approach ensures the node remains reliable, well-tested, and follows n8n community node verification guidelines.

## Resources

- [n8n Community Nodes Documentation](https://docs.n8n.io/integrations/community-nodes/installation/)
- [Directus API Documentation](https://directus.io/docs/api)

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Support

For issues and questions:

- [GitHub Issues](https://github.com/directus/n8n-nodes-directus/issues)
- [Directus Community](https://community.directus.io/)
- [n8n Community](https://community.n8n.io/)

# n8n-nodes-directus

A comprehensive n8n community node package for integrating with Directus CMS.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/reference/license/) workflow automation platform.

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation.

### From npm (when published)

```bash
npm install n8n-nodes-directus
```

## Operations

### Directus Node

- **Items**: Create, read, update, delete items in collections
- **Users**: Invite, update, delete users
- **Files**: Upload, update, delete files

### Directus Trigger Node

- **Item Events**: Trigger on create, update, delete operations in collections
- **User Events**: Trigger on user creation, updates, and deletions
- **File Events**: Trigger on file uploads and updates

## Features

- **Dynamic Field Loading**: Automatically loads available collections and fields from your Directus instance
- **Smart Field Processing**: Handles complex field types and relationships
- **Robust Error Handling**: Comprehensive error handling with detailed error messages
- **Webhook Management**: Automatic webhook creation and cleanup for trigger nodes
- **Type Safety**: Full TypeScript support with proper type definitions

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

- Node.js 18+
- npm or yarn
- Directus instance for testing

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

### Commands

```bash
npm run build         # Build nodes and credentials
npm run dev           # Start n8n with your node loaded
npm run lint          # Check code style
npm run release       # Publish to npm
```

### Testing

1. **Start n8n with your node**:

   ```bash
   npm run dev:n8n
   ```

2. **Access n8n**: Open http://localhost:5678 in your browser

3. **Configure credentials**: Add your Directus API credentials

4. **Test operations**: Create workflows using the Directus nodes

### Testing Webhooks

For webhook testing, you'll need to expose n8n via a public URL since Directus cannot reach localhost:

1. **Set up ngrok**:

   ```bash
   ngrok http 5678
   ```

2. **Create a workflow** with Directus Trigger node

3. **Configure the trigger** (resource, event, collection)

4. **Activate the workflow**

5. **Manual step**: In Directus, go to **Settings → Flows** and edit the created flows to replace `localhost:5678` with your ngrok URL (e.g., `https://your-ngrok-url.ngrok-free.dev`)

6. **Test**: Create/update items in Directus to trigger the webhook

**Note**: Directus cannot reach localhost URLs, so manual URL replacement in the flows is required for webhook testing.

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

# n8n-nodes-directus

A comprehensive n8n community node package for integrating with Directus CMS.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/reference/license/) workflow automation platform.

[Installation](#installation)  
[Operations](#operations)  
[Credentials](#credentials)  
[Compatibility](#compatibility)  
[Development](#development)  
[Resources](#resources)

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

- **Item Events**: Created, updated, deleted
- **User Events**: Created, updated, deleted
- **File Events**: Uploaded

## Credentials

To use this integration, you'll need to configure your Directus API credentials:

1. **Directus URL**: Your instance URL (e.g., `https://your-directus.app`)
2. **Access Token**: Generate a static token in Directus → User Library → [User] → Token
3. **Environment**: Choose "Cloud" or "Self-hosted"

### Getting a Directus Access Token

1. Log into your Directus admin panel
2. Go to User Library
3. Select a user (or create a service user)
4. Generate a static token for that user
5. Copy the token and use it in your n8n credentials

## Compatibility

- **Minimum n8n version**: 1.110.0
- **Tested with**: n8n 1.110.0+
- **Node.js**: >=20.15

## Development

### Development Setup

```bash
git clone <repository-url>
cd n8n-directus
npm install
npm run build
npm test
```

### Local Testing

```bash
# Build and start n8n with Docker
npm run build && docker-compose up -d

# Visit n8n at http://localhost:5678 (admin/admin123)
```

### Commands

```bash
npm run build    # Build nodes
npm test         # Run tests
npm run lint     # Check code style
```

## Resources

- [n8n community nodes documentation](https://docs.n8n.io/integrations/#community-nodes)
- [Directus Documentation](https://docs.directus.io/)
- [Directus API Reference](https://docs.directus.io/reference/introduction/)

## Contributing

1. Fork and create a feature branch
2. Make changes and add tests
3. Ensure `npm test` passes
4. Submit a pull request

## License

MIT License

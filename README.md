# Design Gallery Backend API

A comprehensive backend API built with **Cloudflare Workers**, **Hono framework**, and **TypeScript** for a React Native mobile app featuring Indian traditional wear designs. This implementation uses **Cloudflare R2** for image storage and **D1** for the database, providing a modern, scalable, and efficient backend solution.

## 🚀 Features

### Core Functionality
- **User Authentication**: JWT-based authentication with admin approval system
- **Design Management**: Complete CRUD operations for design catalog with rich metadata
- **Image Storage**: Cloudflare R2 for efficient, scalable image storage and delivery
- **User Favorites**: Personal favorites system with like counting
- **Admin Panel**: Comprehensive admin controls for user and content management
- **Advanced Search**: Full-text search with multiple filtering options
- **Analytics**: View counts, engagement metrics, and usage statistics

### Technical Features
- **Modern Architecture**: Cloudflare Workers with edge computing
- **Type Safety**: Full TypeScript implementation with comprehensive types
- **Rate Limiting**: Built-in rate limiting for API protection
- **Error Handling**: Comprehensive error handling with custom error classes
- **Logging**: Structured logging for debugging and monitoring
- **CORS Support**: Configurable CORS for cross-origin requests
- **Validation**: Input validation and sanitization
- **Security**: Secure headers and authentication middleware

## 🏗️ Architecture

### Technology Stack
- **Runtime**: Cloudflare Workers (Edge Computing)
- **Framework**: Hono (Fast web framework for edge)
- **Language**: TypeScript (Type safety and developer experience)
- **Database**: Cloudflare D1 (Serverless SQLite)
- **Storage**: Cloudflare R2 (Object storage)
- **Authentication**: JWT with bcrypt password hashing

### Database Schema
```sql
-- Users table with admin approval system
users (id, username, password_hash, is_admin, is_approved, created_at, updated_at)

-- Designs table with rich metadata and R2 storage
designs (id, title, description, short_description, long_description, r2_object_key, 
         category, style, colour, fabric, occasion, size_available, price_range, 
         tags, featured, status, view_count, like_count, designer_name, 
         collection_name, season, created_at, updated_at)

-- User favorites with foreign key constraints
user_favorites (id, user_id, design_id, created_at)

-- App settings for configuration
app_settings (id, key, value, description, created_at, updated_at)
```

## 📁 Project Structure

```
src/
├── index.ts                 # Main application entry point
├── types/
│   └── index.ts            # TypeScript type definitions
├── routes/
│   ├── auth.ts             # Authentication endpoints
│   ├── designs.ts          # Design management endpoints
│   ├── upload.ts           # R2 image upload endpoints
│   └── admin.ts            # Admin panel endpoints
├── middleware/
│   ├── auth.ts             # Authentication & authorization
│   ├── rateLimit.ts        # Rate limiting middleware
│   └── logger.ts           # Request logging middleware
├── utils/
│   └── index.ts            # Utility functions and helpers
├── config/
│   └── index.ts            # Configuration management
└── services/               # Service layer (future expansion)

migrations/
└── 0001_initial.sql        # Database schema migration

docs/
├── API_DOCUMENTATION.md    # Detailed API reference
├── CODE_FLOW_GUIDE.md      # Architecture and code flow
└── TESTING_GUIDE.md        # Testing procedures and examples
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Cloudflare account with Workers, D1, and R2 enabled
- Wrangler CLI installed globally

### Installation

1. **Clone and install dependencies**:
   ```bash
   git clone <repository-url>
   cd design-gallery-backend
   npm install
   ```

2. **Configure environment variables** in `wrangler.toml`:
   ```toml
   [env.development.vars]
   JWT_SECRET = "your-super-secret-jwt-key"
   ENVIRONMENT = "development"
   R2_PUBLIC_URL = "https://your-r2-domain.com"
   CLOUDFLARE_ACCOUNT_ID = "your-cloudflare-account-id"

   [[env.development.d1_databases]]
   binding = "DB"
   database_name = "design-gallery-db"
   database_id = "your-d1-database-id"

   [[env.development.r2_buckets]]
   binding = "R2_BUCKET"
   bucket_name = "design-gallery-images"
   ```

3. **Set up the database**:
   ```bash
   # Create D1 database
   wrangler d1 create design-gallery-db

   # Run migrations
   npm run db:migrate:local
   
   # Open database studio (optional)
   npm run db:studio:local
   ```

4. **Create R2 bucket**:
   ```bash
   wrangler r2 bucket create design-gallery-images
   ```

5. **Start development server**:
   ```bash
   npm run dev
   ```

## 📊 API Endpoints

### Authentication (`/api/auth`)
- `POST /register` - Register new user (requires admin approval)
- `POST /login` - Login and receive JWT token
- `GET /me` - Get current user profile
- `POST /refresh` - Refresh JWT token
- `POST /logout` - Logout user

### Design Management (`/api/designs`)
- `GET /` - List designs with search and filters
- `GET /featured` - Get featured designs
- `GET /:id` - Get specific design (increments view count)
- `POST /` - Create new design (admin only)
- `PUT /:id` - Update design (admin only)
- `DELETE /:id` - Delete design (admin only)
- `POST /:id/favorite` - Add design to favorites
- `DELETE /:id/favorite` - Remove from favorites
- `GET /user/favorites` - Get user's favorite designs

### Image Upload (`/api/upload`)
- `POST /image` - Upload image to R2 storage (admin only)
- `GET /presigned-url` - Generate presigned upload URL
- `DELETE /image/*` - Delete image from R2 storage
- `GET /images` - List images in R2 storage
- `GET /image/*/info` - Get image metadata
- `GET /health` - R2 storage health check

### Admin Panel (`/api/admin`)
- `GET /users` - List all users with pagination
- `GET /users/pending` - Get pending user approvals
- `POST /users/:id/approve` - Approve user registration
- `POST /users/:id/reject` - Reject user registration
- `POST /users/:id/toggle-admin` - Toggle admin privileges
- `DELETE /users/:id` - Delete user account
- `POST /users/bulk-approve` - Bulk approve multiple users
- `GET /stats` - System statistics and analytics
- `GET /settings` - Get app settings
- `PUT /settings/:key` - Update app setting
- `POST /settings` - Create new app setting
- `DELETE /settings/:key` - Delete app setting

## 🔧 Development

### Available Scripts
```bash
npm run dev              # Start development server
npm run deploy           # Deploy to Cloudflare Workers
npm run build           # Build for production (dry run)
npm test                # Run tests
npm run db:migrate      # Run database migrations (production)
npm run db:migrate:local # Run database migrations (local)
npm run db:studio       # Open database studio (production)
npm run db:studio:local # Open database studio (local)
npm run lint            # Run ESLint
npm run format          # Format code with Prettier
```

### Database Operations
```bash
# Create new migration
npm run generate:migration migration-name

# Apply migrations to local database
npm run db:migrate:local

# Apply migrations to production database
npm run db:migrate

# Open database studio for inspection
npm run db:studio:local
```

## 🔐 Authentication Flow

1. **User Registration**: Users register with username/password
2. **Admin Approval**: Registrations require admin approval
3. **JWT Authentication**: Approved users receive JWT tokens
4. **Token Validation**: All protected routes validate JWT tokens
5. **Admin Privileges**: Admin users have additional permissions

## 📁 R2 Storage Structure

Images are organized in R2 with the following structure:
```
bucket/
├── general/2024/01/    # General category images
├── sarees/2024/01/     # Saree category images
├── lehengas/2024/01/   # Lehenga category images
└── anarkalis/2024/01/  # Anarkali category images
```

Each file includes metadata:
- Original filename
- Upload timestamp
- Uploaded by (username)
- Category
- Content type

## 🚀 Deployment

### Production Deployment
```bash
# Deploy to production
npm run deploy

# Deploy with environment
wrangler deploy --env production
```

### Environment Configuration
Configure production environment in `wrangler.toml`:
```toml
[env.production.vars]
JWT_SECRET = "production-secret-key"
ENVIRONMENT = "production"
R2_PUBLIC_URL = "https://your-production-domain.com"
```

## 📈 Monitoring and Analytics

The API provides comprehensive analytics:
- User registration and approval metrics
- Design engagement (views, likes, favorites)
- Popular designs and trending content
- System health and performance metrics
- Storage usage and upload statistics

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes and add tests
4. Commit your changes: `git commit -am 'Add feature'`
5. Push to the branch: `git push origin feature-name`
6. Submit a pull request

## 📚 Documentation

- [API Documentation](docs/API_DOCUMENTATION.md) - Detailed API reference
- [Code Flow Guide](docs/CODE_FLOW_GUIDE.md) - Architecture overview
- [Testing Guide](docs/TESTING_GUIDE.md) - Testing procedures

## 🛠️ Troubleshooting

### Common Issues

1. **Database Connection Issues**:
   - Ensure D1 database is created and configured
   - Check database ID in wrangler.toml
   - Verify migrations have been applied

2. **R2 Storage Issues**:
   - Confirm R2 bucket exists and is accessible
   - Check R2 bucket name in wrangler.toml
   - Verify R2 public URL configuration

3. **Authentication Problems**:
   - Ensure JWT_SECRET is set and consistent
   - Check token expiration settings
   - Verify admin user exists and is approved

### Debug Mode
Enable debug logging by setting `ENVIRONMENT=development` in your environment variables.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🏷️ Version

**Current Version**: 1.0.0

### Recent Updates
- ✅ Migrated from Cloudflare Images to R2 storage
- ✅ Implemented comprehensive design management
- ✅ Added full-text search and advanced filtering
- ✅ Enhanced admin panel with analytics
- ✅ Improved error handling and validation
- ✅ Added comprehensive API documentation

---

**Built with ❤️ for the Design Gallery React Native App** 
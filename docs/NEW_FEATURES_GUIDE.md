# New Features Guide - Shopping Cart & WhatsApp Sharing

## 🛒 Shopping Cart System

### Overview
The shopping cart system allows approved users to select designs and add them to their personal cart for ordering purposes. Each user has their own cart that persists across sessions.

### Database Schema

#### Tables Added
```sql
-- User shopping cart
CREATE TABLE user_carts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id) -- One cart per user
);

-- Cart items
CREATE TABLE cart_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cart_id INTEGER NOT NULL,
    design_id INTEGER NOT NULL,
    quantity INTEGER DEFAULT 1,
    notes TEXT, -- Customer notes for the design
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (cart_id) REFERENCES user_carts(id) ON DELETE CASCADE,
    FOREIGN KEY (design_id) REFERENCES designs(id) ON DELETE CASCADE,
    UNIQUE(cart_id, design_id) -- One item per design per cart
);
```

### API Endpoints

#### 1. Get User Cart
```http
GET /api/cart
Authorization: Bearer <user_token>
```

**Response:**
```json
{
  "success": true,
  "message": "Cart retrieved successfully",
  "data": {
    "id": 1,
    "user_id": 2,
    "items": [
      {
        "id": 1,
        "cart_id": 1,
        "design_id": 5,
        "quantity": 2,
        "notes": "Need in blue color",
        "created_at": "2024-01-01T10:00:00Z",
        "updated_at": "2024-01-01T10:00:00Z",
        "design": {
          "id": 5,
          "title": "Elegant Silk Saree",
          "design_number": "SS001",
          "image_url": "https://...",
          "category": "sarees",
          "price_range": "5000-8000",
          // ... other design fields
        }
      }
    ],
    "total_items": 1,
    "created_at": "2024-01-01T09:00:00Z",
    "updated_at": "2024-01-01T10:00:00Z"
  }
}
```

#### 2. Add Design to Cart
```http
POST /api/cart/items
Authorization: Bearer <user_token>
Content-Type: application/json

{
  "design_id": 5,
  "quantity": 2,
  "notes": "Need in blue color"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Item added to cart successfully"
}
```

#### 3. Update Cart Item
```http
PUT /api/cart/items/{item_id}
Authorization: Bearer <user_token>
Content-Type: application/json

{
  "quantity": 3,
  "notes": "Updated notes"
}
```

#### 4. Remove Item from Cart
```http
DELETE /api/cart/items/{item_id}
Authorization: Bearer <user_token>
```

#### 5. Clear Entire Cart
```http
DELETE /api/cart
Authorization: Bearer <user_token>
```

### Features
- **One cart per user**: Each user has exactly one cart
- **Quantity management**: Users can specify quantity (1-10 per design)
- **Notes support**: Users can add custom notes for each design
- **Duplicate prevention**: Same design can't be added twice (quantity is updated instead)
- **Automatic cart creation**: Cart is created automatically when first item is added

---

## 📱 WhatsApp Sharing System

### Overview
The WhatsApp sharing system allows users to share selected designs with the organization via WhatsApp. It generates pre-formatted messages with design details and creates WhatsApp share links.

### Configuration

#### App Settings
The system uses these app settings (automatically added in migration):

```sql
-- WhatsApp contact numbers (comma-separated)
INSERT INTO app_settings (key, value, description) VALUES
('whatsapp_contact_numbers', '+919876543210,+919876543211', 'WhatsApp contact numbers for design sharing');

-- Message template
INSERT INTO app_settings (key, value, description) VALUES
('whatsapp_message_template', 'Hi! I found these beautiful designs in the gallery. Please check them out: {design_list}', 'WhatsApp message template');
```

### API Endpoint

#### Share Designs via WhatsApp
```http
POST /api/cart/share
Authorization: Bearer <user_token>
Content-Type: application/json

{
  "design_ids": [1, 2, 3],
  "message": "Check out these beautiful designs!"
}
```

**Response:**
```json
{
  "success": true,
  "message": "WhatsApp share link generated successfully",
  "data": {
    "share_url": "https://wa.me/919876543210?text=Hi!%20I%20found%20these%20beautiful%20designs...",
    "message": "Hi! I found these beautiful designs in the gallery. Please check them out:\n\n• Elegant Silk Saree - Design #SS001 - sarees - traditional - blue\n• Royal Lehenga - Design #RL002 - lehengas - contemporary - red",
    "design_count": 2
  }
}
```

### Features
- **Multiple design sharing**: Share up to 20 designs at once
- **Custom messages**: Users can add custom messages
- **Design details**: Automatically includes design number, category, style, color
- **WhatsApp integration**: Generates direct WhatsApp share links
- **Configurable contacts**: Admin can update WhatsApp numbers in app settings

---

## 🔍 Enhanced Search & Filtering

### New Search Capabilities

#### 1. Design Number Search
```http
GET /api/designs?design_number=SS001
```

#### 2. Enhanced Full-Text Search
The search now includes `design_number` field:
```http
GET /api/designs?q=silk
```
This searches across:
- title
- description
- short_description
- long_description
- tags
- designer_name
- collection_name
- **design_number** (new)

### Advanced Sorting

#### Sort Parameters
```http
GET /api/designs?sort_by=created_at&sort_order=desc
```

**Available sort fields:**
- `created_at` - Design creation date (default)
- `title` - Design title
- `view_count` - Number of views
- `like_count` - Number of likes
- `design_number` - Customer-facing design number
- `category` - Design category
- `style` - Design style

**Sort orders:**
- `asc` - Ascending
- `desc` - Descending (default)

#### Examples
```http
# Sort by newest first
GET /api/designs?sort_by=created_at&sort_order=desc

# Sort by title alphabetically
GET /api/designs?sort_by=title&sort_order=asc

# Sort by most viewed
GET /api/designs?sort_by=view_count&sort_order=desc

# Sort by design number
GET /api/designs?sort_by=design_number&sort_order=asc
```

---

## 🚀 Implementation Guide

### 1. Apply Database Migration
```bash
# Apply the new migration
wrangler d1 execute DB --file=./migrations/0003_add_shopping_cart.sql
```

### 2. Deploy Updated Code
```bash
# Deploy to production
npm run deploy
```

### 3. Test the Features
```bash
# Run the test script
./scripts/test-new-features.sh
```

### 4. Frontend Integration Examples

#### React/Next.js Shopping Cart
```javascript
// Add to cart
const addToCart = async (designId, quantity = 1, notes = '') => {
  const response = await fetch('/api/cart/items', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      design_id: designId,
      quantity,
      notes
    })
  });
  return response.json();
};

// Get cart
const getCart = async () => {
  const response = await fetch('/api/cart', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  return response.json();
};
```

#### WhatsApp Sharing
```javascript
// Share designs via WhatsApp
const shareViaWhatsApp = async (designIds, customMessage = '') => {
  const response = await fetch('/api/cart/share', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      design_ids: designIds,
      message: customMessage
    })
  });
  
  const result = await response.json();
  
  if (result.success) {
    // Open WhatsApp share link
    window.open(result.data.share_url, '_blank');
  }
};
```

#### Enhanced Search
```javascript
// Search with design number
const searchByDesignNumber = async (designNumber) => {
  const response = await fetch(`/api/designs?design_number=${designNumber}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  return response.json();
};

// Advanced sorting
const getDesignsSorted = async (sortBy = 'created_at', sortOrder = 'desc') => {
  const response = await fetch(`/api/designs?sort_by=${sortBy}&sort_order=${sortOrder}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  return response.json();
};
```

---

## 📋 API Reference Summary

### New Endpoints
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/cart` | Get user's shopping cart | Yes |
| POST | `/api/cart/items` | Add design to cart | Yes |
| PUT | `/api/cart/items/{id}` | Update cart item | Yes |
| DELETE | `/api/cart/items/{id}` | Remove item from cart | Yes |
| DELETE | `/api/cart` | Clear entire cart | Yes |
| POST | `/api/cart/share` | Share designs via WhatsApp | Yes |

### Enhanced Endpoints
| Method | Endpoint | New Features |
|--------|----------|--------------|
| GET | `/api/designs` | `design_number` filter, `sort_by`, `sort_order` |

### New Query Parameters
- `design_number` - Search by specific design number
- `sort_by` - Sort field (created_at, title, view_count, like_count, design_number, category, style)
- `sort_order` - Sort direction (asc, desc)

---

## 🔧 Configuration

### WhatsApp Settings
Update WhatsApp contact numbers in D1 Studio:
```sql
UPDATE app_settings 
SET value = '+919876543210,+919876543211' 
WHERE key = 'whatsapp_contact_numbers';
```

### Cart Settings
```sql
-- Maximum items per cart
UPDATE app_settings SET value = '50' WHERE key = 'max_cart_items';

-- Cart expiry days
UPDATE app_settings SET value = '30' WHERE key = 'cart_expiry_days';
```

---

## 🧪 Testing

### Manual Testing
1. **Cart Operations:**
   - Add design to cart
   - Update quantity and notes
   - Remove items
   - Clear entire cart

2. **WhatsApp Sharing:**
   - Share single design
   - Share multiple designs
   - Test with custom messages

3. **Enhanced Search:**
   - Search by design number
   - Test all sort options
   - Combine filters and sorting

### Automated Testing
Run the provided test script:
```bash
./scripts/test-new-features.sh
```

---

## 🎯 Next Steps

### Frontend Development
1. **Shopping Cart UI:**
   - Cart icon with item count
   - Cart page with item list
   - Add/remove/update functionality
   - Checkout flow

2. **WhatsApp Sharing:**
   - Share buttons on design cards
   - Bulk selection for sharing
   - Custom message input

3. **Enhanced Search:**
   - Design number search field
   - Sort dropdown
   - Advanced filter forms

### Backend Enhancements
1. **Order Management:**
   - Convert cart to orders
   - Order status tracking
   - Payment integration

2. **Analytics:**
   - Cart abandonment tracking
   - Popular shared designs
   - Search analytics

3. **Notifications:**
   - WhatsApp notifications for new orders
   - Email confirmations
   - SMS notifications 
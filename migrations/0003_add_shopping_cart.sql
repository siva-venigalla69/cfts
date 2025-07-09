-- Add shopping cart functionality
-- Migration: 0003_add_shopping_cart.sql

-- Shopping cart table for users
CREATE TABLE IF NOT EXISTS user_carts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id) -- One cart per user
);

-- Cart items table
CREATE TABLE IF NOT EXISTS cart_items (
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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_carts_user_id ON user_carts(user_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_cart_id ON cart_items(cart_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_design_id ON cart_items(design_id);

-- Add WhatsApp sharing settings to app_settings
INSERT OR IGNORE INTO app_settings (key, value, description) VALUES
('whatsapp_contact_numbers', '+919876543210,+919876543211', 'WhatsApp contact numbers for design sharing (comma-separated)'),
('whatsapp_message_template', 'Hi! I found these beautiful designs in the gallery. Please check them out: {design_list}', 'WhatsApp message template for sharing designs'),
('cart_expiry_days', '30', 'Number of days before cart items expire'),
('max_cart_items', '50', 'Maximum number of items allowed in cart'); 
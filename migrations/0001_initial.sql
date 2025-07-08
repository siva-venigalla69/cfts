-- Design Gallery Database Schema
-- Optimized for Cloudflare D1 and FastAPI implementation

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    is_admin BOOLEAN DEFAULT FALSE,
    is_approved BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Designs table
CREATE TABLE IF NOT EXISTS designs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    short_description TEXT,
    long_description TEXT,
    r2_object_key TEXT NOT NULL, -- Cloudflare R2 object key
    category TEXT NOT NULL,
    style TEXT,
    colour TEXT,
    fabric TEXT,
    occasion TEXT,
    size_available TEXT,
    price_range TEXT,
    tags TEXT,
    featured BOOLEAN DEFAULT FALSE,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'draft')),
    view_count INTEGER DEFAULT 0,
    like_count INTEGER DEFAULT 0,
    designer_name TEXT,
    collection_name TEXT,
    season TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- User favorites table
CREATE TABLE IF NOT EXISTS user_favorites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    design_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (design_id) REFERENCES designs(id) ON DELETE CASCADE,
    UNIQUE(user_id, design_id)
);

-- App settings table
CREATE TABLE IF NOT EXISTS app_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT NOT NULL UNIQUE,
    value TEXT NOT NULL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_is_approved ON users(is_approved);

CREATE INDEX IF NOT EXISTS idx_designs_category ON designs(category);
CREATE INDEX IF NOT EXISTS idx_designs_featured ON designs(featured);
CREATE INDEX IF NOT EXISTS idx_designs_status ON designs(status);
CREATE INDEX IF NOT EXISTS idx_designs_created_at ON designs(created_at);
CREATE INDEX IF NOT EXISTS idx_designs_view_count ON designs(view_count);
CREATE INDEX IF NOT EXISTS idx_designs_like_count ON designs(like_count);

CREATE INDEX IF NOT EXISTS idx_user_favorites_user_id ON user_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_user_favorites_design_id ON user_favorites(design_id);

CREATE INDEX IF NOT EXISTS idx_app_settings_key ON app_settings(key);

-- Insert default admin user (password: your_secure_password)
INSERT OR IGNORE INTO users (username, password_hash, is_admin, is_approved) 
VALUES ('admin', 'YOUR_GENERATED_HASH_HERE', TRUE, TRUE);

-- Insert default app settings
INSERT OR IGNORE INTO app_settings (key, value, description) VALUES
('app_name', 'Design Gallery', 'Application name'),
('app_version', '1.0.0', 'Application version'),
('maintenance_mode', 'false', 'Maintenance mode flag'),
('max_upload_size', '10485760', 'Maximum upload size in bytes (10MB)'),
('allowed_file_types', 'image/jpeg,image/png,image/webp', 'Allowed file types for upload'),
('featured_designs_limit', '10', 'Number of featured designs to show'),
('pagination_default_size', '20', 'Default pagination size'),
('pagination_max_size', '100', 'Maximum pagination size');

-- Create full-text search trigger for designs (SQLite FTS5)
-- This will be executed if FTS5 is available
CREATE VIRTUAL TABLE IF NOT EXISTS designs_fts USING fts5(
    title, 
    description, 
    short_description, 
    long_description, 
    tags, 
    designer_name, 
    collection_name,
    content='designs',
    content_rowid='id'
);

-- Trigger to keep FTS table in sync
CREATE TRIGGER IF NOT EXISTS designs_ai AFTER INSERT ON designs BEGIN
  INSERT INTO designs_fts(rowid, title, description, short_description, long_description, tags, designer_name, collection_name)
  VALUES (new.id, new.title, new.description, new.short_description, new.long_description, new.tags, new.designer_name, new.collection_name);
END;

CREATE TRIGGER IF NOT EXISTS designs_ad AFTER DELETE ON designs BEGIN
  INSERT INTO designs_fts(designs_fts, rowid, title, description, short_description, long_description, tags, designer_name, collection_name)
  VALUES('delete', old.id, old.title, old.description, old.short_description, old.long_description, old.tags, old.designer_name, old.collection_name);
END;

CREATE TRIGGER IF NOT EXISTS designs_au AFTER UPDATE ON designs BEGIN
  INSERT INTO designs_fts(designs_fts, rowid, title, description, short_description, long_description, tags, designer_name, collection_name)
  VALUES('delete', old.id, old.title, old.description, old.short_description, old.long_description, old.tags, old.designer_name, old.collection_name);
  INSERT INTO designs_fts(rowid, title, description, short_description, long_description, tags, designer_name, collection_name)
  VALUES (new.id, new.title, new.description, new.short_description, new.long_description, new.tags, new.designer_name, new.collection_name);
END; 
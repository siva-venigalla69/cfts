-- Add multiple images support for designs
-- Migration: 0004_add_design_images.sql

-- Design images table for storing multiple images per design
CREATE TABLE IF NOT EXISTS design_images (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    design_id INTEGER NOT NULL,
    r2_object_key TEXT NOT NULL, -- Cloudflare R2 object key
    image_order INTEGER DEFAULT 0, -- Order of images (0 = primary image)
    is_primary BOOLEAN DEFAULT FALSE, -- Mark primary/cover image
    alt_text TEXT, -- Alternative text for accessibility
    caption TEXT, -- Optional image caption
    image_type TEXT DEFAULT 'standard', -- Type: standard, thumbnail, detail, etc.
    file_size INTEGER, -- File size in bytes
    width INTEGER, -- Image width in pixels
    height INTEGER, -- Image height in pixels
    content_type TEXT, -- MIME type (image/jpeg, image/png, etc.)
    uploaded_by TEXT, -- Username who uploaded the image
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (design_id) REFERENCES designs(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_design_images_design_id ON design_images(design_id);
CREATE INDEX IF NOT EXISTS idx_design_images_order ON design_images(design_id, image_order);
CREATE INDEX IF NOT EXISTS idx_design_images_primary ON design_images(design_id, is_primary);
CREATE INDEX IF NOT EXISTS idx_design_images_type ON design_images(image_type);

-- Trigger to ensure only one primary image per design
CREATE TRIGGER IF NOT EXISTS ensure_single_primary_image
    BEFORE INSERT ON design_images
    WHEN NEW.is_primary = 1
BEGIN
    UPDATE design_images 
    SET is_primary = 0 
    WHERE design_id = NEW.design_id AND is_primary = 1;
END;

-- Trigger to update timestamps
CREATE TRIGGER IF NOT EXISTS design_images_update_timestamp
    AFTER UPDATE ON design_images
BEGIN
    UPDATE design_images 
    SET updated_at = CURRENT_TIMESTAMP 
    WHERE id = NEW.id;
END;

-- Migrate existing single images to the new table
-- Insert existing r2_object_key as primary images for existing designs
INSERT INTO design_images (design_id, r2_object_key, image_order, is_primary, image_type, created_at, updated_at)
SELECT 
    id as design_id,
    r2_object_key,
    0 as image_order,
    1 as is_primary,
    'standard' as image_type,
    created_at,
    updated_at
FROM designs 
WHERE r2_object_key IS NOT NULL AND r2_object_key != '';

-- Add app settings for image management
INSERT OR IGNORE INTO app_settings (key, value, description) VALUES
('max_images_per_design', '10', 'Maximum number of images allowed per design'),
('image_upload_batch_size', '5', 'Maximum number of images that can be uploaded in a single batch'),
('auto_generate_thumbnails', 'true', 'Automatically generate thumbnail variants for uploaded images'),
('image_quality_standard', '85', 'Standard JPEG quality for uploaded images (1-100)'),
('image_max_width', '2048', 'Maximum width for uploaded images in pixels'),
('image_max_height', '2048', 'Maximum height for uploaded images in pixels'); 
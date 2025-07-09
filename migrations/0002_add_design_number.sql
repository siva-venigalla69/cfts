-- Add design_number field to designs table for customer ordering
-- Migration: 0002_add_design_number.sql
-- Simplified version for empty designs table

-- Step 1: Drop FTS triggers (they depend on table structure)
DROP TRIGGER IF EXISTS designs_ai;
DROP TRIGGER IF EXISTS designs_ad; 
DROP TRIGGER IF EXISTS designs_au;

-- Step 2: Drop FTS virtual table (it depends on table columns)
DROP TABLE IF EXISTS designs_fts;

-- Step 3: Drop existing designs table (since it's empty)
DROP TABLE IF EXISTS designs;

-- Step 4: Recreate designs table with design_number column
CREATE TABLE designs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    short_description TEXT,
    long_description TEXT,
    r2_object_key TEXT NOT NULL,
    design_number TEXT UNIQUE, -- Customer-facing design number for orders
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

-- Step 5: Create all indexes
CREATE INDEX IF NOT EXISTS idx_designs_design_number ON designs(design_number);
CREATE INDEX IF NOT EXISTS idx_designs_category ON designs(category);
CREATE INDEX IF NOT EXISTS idx_designs_featured ON designs(featured);
CREATE INDEX IF NOT EXISTS idx_designs_status ON designs(status);
CREATE INDEX IF NOT EXISTS idx_designs_created_at ON designs(created_at);
CREATE INDEX IF NOT EXISTS idx_designs_view_count ON designs(view_count);
CREATE INDEX IF NOT EXISTS idx_designs_like_count ON designs(like_count);

-- Step 6: Create FTS virtual table with design_number included
CREATE VIRTUAL TABLE IF NOT EXISTS designs_fts USING fts5(
    title, 
    description, 
    short_description, 
    long_description, 
    tags, 
    design_number,  -- Now includes design_number in search
    designer_name, 
    collection_name,
    content='designs',
    content_rowid='id'
);

-- Step 7: Create triggers to keep FTS in sync
CREATE TRIGGER IF NOT EXISTS designs_ai AFTER INSERT ON designs BEGIN
  INSERT INTO designs_fts(rowid, title, description, short_description, long_description, tags, design_number, designer_name, collection_name)
  VALUES (new.id, new.title, new.description, new.short_description, new.long_description, new.tags, new.design_number, new.designer_name, new.collection_name);
END;

CREATE TRIGGER IF NOT EXISTS designs_ad AFTER DELETE ON designs BEGIN
  INSERT INTO designs_fts(designs_fts, rowid, title, description, short_description, long_description, tags, design_number, designer_name, collection_name)
  VALUES('delete', old.id, old.title, old.description, old.short_description, old.long_description, old.tags, old.design_number, old.designer_name, old.collection_name);
END;

CREATE TRIGGER IF NOT EXISTS designs_au AFTER UPDATE ON designs BEGIN
  INSERT INTO designs_fts(designs_fts, rowid, title, description, short_description, long_description, tags, design_number, designer_name, collection_name)
  VALUES('delete', old.id, old.title, old.description, old.short_description, old.long_description, old.tags, old.design_number, old.designer_name, old.collection_name);
  INSERT INTO designs_fts(rowid, title, description, short_description, long_description, tags, design_number, designer_name, collection_name)
  VALUES (new.id, new.title, new.description, new.short_description, new.long_description, new.tags, new.design_number, new.designer_name, new.collection_name);
END; 
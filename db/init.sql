-- Initializes the app data models in the database
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- User accounts
CREATE TABLE account (
  account_id TEXT PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_charity BOOLEAN DEFAULT FALSE, 
  account_created_at TIMESTAMP DEFAULT current_timestamp
);

-- User listings
CREATE TABLE listing (
  listing_id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), 
  listing_owner_id TEXT REFERENCES account(account_id),
  listing_description TEXT,
  listing_category TEXT,
  listing_location TEXT,
  listing_contact TEXT,
  listing_collection TEXT,
  listing_image_key TEXT,
  listing_created_at TIMESTAMP DEFAULT current_timestamp
);

-- Foreign key lookups
CREATE INDEX listing_owner_id_fkey ON listing(listing_owner_id);

-- Full text search
ALTER TABLE listing
ADD COLUMN textsearchable_index_col tsvector
	GENERATED ALWAYS AS (
		to_tsvector('english', coalesce(listing_description, ''))
	) STORED;

CREATE INDEX listing_idx_listing_owner_id_listing_at ON "listing" ("listing_owner_id","listing_created_at" desc);

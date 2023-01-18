-- Initializes the app data models in the database
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE account (
  account_id TEXT PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_created_at TIMESTAMP DEFAULT current_timestamp
);

CREATE TABLE listing (
  listing_id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), 
  listing_owner_id TEXT REFERENCES account(account_id),
  listing_description TEXT,
  listing_image_key TEXT,
  listing_created_at TIMESTAMP DEFAULT current_timestamp
);
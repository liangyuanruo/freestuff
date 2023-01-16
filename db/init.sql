-- Initializes the app data models in the database
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE account (
  account_id TEXT PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_created_at TIMESTAMP DEFAULT current_timestamp
);

CREATE TABLE post (
  post_id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), 
  post_owner_id TEXT REFERENCES account(account_id),
  post_description TEXT,
  post_image_key TEXT,
  post_created_at TIMESTAMP DEFAULT current_timestamp
);
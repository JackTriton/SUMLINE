CREATE TABLE guest_tokens (
  token_hash TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL
);
CREATE TABLE guest_rate (
  bucket TEXT PRIMARY KEY NOT NULL,
  count INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);

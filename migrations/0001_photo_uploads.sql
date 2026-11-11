PRAGMA foreign_keys = ON;

CREATE TABLE app_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  uploads_open INTEGER NOT NULL DEFAULT 1 CHECK (uploads_open IN (0, 1)),
  max_storage_bytes INTEGER NOT NULL DEFAULT 8000000000,
  total_photos INTEGER NOT NULL DEFAULT 0,
  used_bytes INTEGER NOT NULL DEFAULT 0,
  reserved_bytes INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

INSERT INTO app_settings (id) VALUES (1);

CREATE TABLE device_usage (
  device_hash TEXT PRIMARY KEY,
  uploaded_count INTEGER NOT NULL DEFAULT 0,
  reserved_count INTEGER NOT NULL DEFAULT 0,
  first_seen_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  last_upload_at TEXT
);

CREATE TABLE upload_batches (
  id TEXT PRIMARY KEY,
  device_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  completed_at TEXT,
  status TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'complete', 'partial', 'failed')),
  response_json TEXT
);

CREATE TABLE photos (
  id TEXT PRIMARY KEY,
  object_key TEXT NOT NULL UNIQUE,
  size INTEGER NOT NULL CHECK (size > 0 AND size <= 8388608),
  mime_type TEXT NOT NULL,
  uploaded_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  device_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'reserved' CHECK (status IN ('reserved', 'ready', 'failed', 'deleted')),
  batch_id TEXT NOT NULL REFERENCES upload_batches(id),
  original_size INTEGER NOT NULL,
  error_code TEXT
);

CREATE INDEX photos_status_uploaded_idx ON photos(status, uploaded_at DESC);
CREATE INDEX photos_device_status_idx ON photos(device_hash, status);
CREATE INDEX batches_device_created_idx ON upload_batches(device_hash, created_at DESC);

CREATE TABLE rate_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  device_hash TEXT NOT NULL,
  ip_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX rate_device_time_idx ON rate_events(device_hash, created_at);
CREATE INDEX rate_ip_time_idx ON rate_events(ip_hash, created_at);

CREATE TRIGGER photos_before_reserve
BEFORE INSERT ON photos
WHEN NEW.status = 'reserved'
BEGIN
  SELECT CASE
    WHEN (SELECT uploads_open FROM app_settings WHERE id = 1) = 0
    THEN RAISE(ABORT, 'UPLOADS_CLOSED')
  END;
  SELECT CASE
    WHEN (SELECT used_bytes + reserved_bytes + NEW.size FROM app_settings WHERE id = 1)
      > (SELECT max_storage_bytes FROM app_settings WHERE id = 1)
    THEN RAISE(ABORT, 'STORAGE_FULL')
  END;
END;

CREATE TRIGGER photos_after_reserve
AFTER INSERT ON photos
WHEN NEW.status = 'reserved'
BEGIN
  INSERT INTO device_usage (device_hash, reserved_count)
  VALUES (NEW.device_hash, 1)
  ON CONFLICT(device_hash) DO UPDATE SET reserved_count = reserved_count + 1;
  UPDATE app_settings
  SET reserved_bytes = reserved_bytes + NEW.size,
      updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
  WHERE id = 1;
END;

CREATE TRIGGER photos_after_ready
AFTER UPDATE OF status ON photos
WHEN OLD.status = 'reserved' AND NEW.status = 'ready'
BEGIN
  UPDATE device_usage
  SET reserved_count = reserved_count - 1,
      uploaded_count = uploaded_count + 1,
      last_upload_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
  WHERE device_hash = NEW.device_hash;
  UPDATE app_settings
  SET reserved_bytes = reserved_bytes - NEW.size,
      used_bytes = used_bytes + NEW.size,
      total_photos = total_photos + 1,
      updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
  WHERE id = 1;
END;

CREATE TRIGGER photos_after_failed
AFTER UPDATE OF status ON photos
WHEN OLD.status = 'reserved' AND NEW.status = 'failed'
BEGIN
  UPDATE device_usage SET reserved_count = reserved_count - 1 WHERE device_hash = NEW.device_hash;
  UPDATE app_settings
  SET reserved_bytes = reserved_bytes - NEW.size,
      updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
  WHERE id = 1;
END;

CREATE TRIGGER photos_after_deleted
AFTER UPDATE OF status ON photos
WHEN OLD.status = 'ready' AND NEW.status = 'deleted'
BEGIN
  UPDATE app_settings
  SET used_bytes = used_bytes - OLD.size,
      total_photos = total_photos - 1,
      updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
  WHERE id = 1;
END;

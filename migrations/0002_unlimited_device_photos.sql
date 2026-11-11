DROP TRIGGER IF EXISTS photos_before_reserve;

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

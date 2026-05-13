ALTER TABLE profiles ADD COLUMN IF NOT EXISTS linked_client_id uuid REFERENCES clients(id) ON DELETE SET NULL;

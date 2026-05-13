-- Create Media & Press Operations department
INSERT INTO departments (name)
SELECT 'Media & Press Operations'
WHERE NOT EXISTS (
    SELECT 1 FROM departments WHERE name = 'Media & Press Operations'
);

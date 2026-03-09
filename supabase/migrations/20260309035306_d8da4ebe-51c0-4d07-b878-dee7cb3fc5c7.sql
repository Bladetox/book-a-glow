
-- Link phenomebeautys@gmail.com as PhenomeBeauty tenant owner
UPDATE tenants 
SET owner_id = '0749beca-a6ee-45dd-8896-e047d1cab1a2'
WHERE id = 'phenomebeauty';

-- Update her profile with tenant association (keep role as 'admin' which is allowed)
UPDATE profiles 
SET tenant_id = 'phenomebeauty', role = 'admin', full_name = COALESCE(full_name, 'PhenomeBeauty')
WHERE id = '0749beca-a6ee-45dd-8896-e047d1cab1a2';

-- Grant owner role in user_roles
INSERT INTO user_roles (user_id, tenant_id, role)
VALUES ('0749beca-a6ee-45dd-8896-e047d1cab1a2', 'phenomebeauty', 'owner')
ON CONFLICT DO NOTHING;

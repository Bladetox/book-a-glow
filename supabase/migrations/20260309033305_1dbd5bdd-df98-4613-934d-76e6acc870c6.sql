
-- Link the existing PhenomeBeauty admin user as tenant owner
UPDATE public.tenants 
SET owner_id = '9362be5f-2a78-4ebc-98c0-6f1026a617b2'
WHERE id = 'phenomebeauty';

-- Add owner role for this user
INSERT INTO public.user_roles (user_id, tenant_id, role)
VALUES ('9362be5f-2a78-4ebc-98c0-6f1026a617b2', 'phenomebeauty', 'owner')
ON CONFLICT DO NOTHING;

-- Match the final EXECUTE privileges already deployed to the live project.
REVOKE ALL ON FUNCTION public.replace_consistency_program_services(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.replace_consistency_program_services(uuid, jsonb) TO authenticated;

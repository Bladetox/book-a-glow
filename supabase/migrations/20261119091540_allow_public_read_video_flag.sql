-- Public read of app_settings: adds feature_flag_video_consultations to the
-- allow-list, so guests' booking pages can read the tenant's video flag.
-- Applied to production via the Supabase SQL Editor.

drop policy if exists "Public read allowed settings" on public.app_settings;

create policy "Public read allowed settings" on public.app_settings
  for select to public
  using (key = any (array[
    'booking_ref_prefix','business_name','currency','theme_id','google_calendar_id',
    'confirmation_title','confirmation_intro','confirmation_outro','sign_off','tagline',
    'subtitle','abbreviation','cta_label','deposit_percent','rate_per_km',
    'default_distance_km','min_notice_hours','max_advance_days','fixed_origin_address',
    'terms_sections','splash_welcome_label','splash_tagline1','splash_tagline2',
    'splash_cta_label','splash_background_url','referral_options','suggested_addons',
    'mobile_service_enabled','client_label_existing','client_label_new','brand_font_url',
    'brand_name_color','salon_address','category_order','services_step_heading',
    'client_type_existing_label','client_type_new_label',
    'client_type_existing_notes_placeholder','requires_deposit','success_deposit_title',
    'success_deposit_tagline','success_deposit_body','success_deposit_intent',
    'success_deposit_closing','success_deposit_signoff','success_final_title',
    'success_final_body','success_final_review_cta','success_final_rebook',
    'success_final_signoff','google_review_url','min_notice_minutes','overrun_minutes',
    'yoco_public_key','yoco_mode','payshap_enabled','payshap_phone',
    'feature_flag_payshap_payments','feature_flag_video_consultations']::text[]));

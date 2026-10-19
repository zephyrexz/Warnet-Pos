-- Grant execute permission for create_user_profile function
grant execute on function public.create_user_profile to authenticated;
grant execute on function public.create_user_profile to anon;

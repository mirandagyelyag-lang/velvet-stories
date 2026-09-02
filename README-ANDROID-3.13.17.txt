Velvet Stories Android 3.13.17

Native recovery build.
- Android build does not ship the PWA service worker.
- Uses a clean Capacitor http://localhost origin.
- Recovers the PUBLIC Supabase client key from local env/builds or the deployed Velvet web app.
- Never accepts service_role, supabase_admin, or sb_secret_ keys.
- Installer builds, verifies, installs, and opens Velvet on one authorized Android device.

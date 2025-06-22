# Supabase Auth & Beta Access Setup Guide

## ✅ Step 2: Set up Supabase Auth

### 1. Create your Supabase project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Choose a name like "buyermap-app"
3. Set a strong database password
4. Wait for the project to be created

### 2. Get your Supabase credentials

1. In your Supabase dashboard, go to **Settings** → **API**
2. Copy these values:
   - Project URL
   - anon public key
   - service_role key (keep this secret!)

### 3. Set up environment variables

Create a `.env.local` file in your project root with:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Beta Access Password (choose any password you want)
BETA_ACCESS_PASSWORD=your_chosen_password
```

### 4. Enable email magic link auth

1. In Supabase dashboard, go to **Authentication** → **Settings**
2. Under **Auth Providers**, make sure **Email** is enabled
3. Configure **Site URL** to `http://localhost:3000` (for development)
4. Add **Redirect URLs**:
   - `http://localhost:3000/auth/callback`
   - `https://yourdomain.com/auth/callback` (for production)

### 5. Set up email templates (optional)

1. Go to **Authentication** → **Email Templates**
2. Customize the magic link email if desired
3. Make sure the action link points to your callback URL

### 6. Test the setup

1. Run `npm run dev`
2. Visit `http://localhost:3000`
3. You should see the beta password screen first
4. Enter your `BETA_ACCESS_PASSWORD`
5. Then you should see the auth screen
6. Try signing up with your email
7. Check your email for the magic link
8. Click the link - you should be redirected and logged in

## ✅ Step 3: Add the password layer

The password layer is already implemented! Here's how it works:

### How the flow works:

1. **Beta Password Check** (first barrier)
   - User sees beta password screen
   - Must enter correct password from `BETA_ACCESS_PASSWORD`
   - Password is stored in localStorage for the session

2. **Supabase Auth** (second barrier)
   - After beta password, user sees auth screen
   - Can sign up/sign in with email magic links
   - Session is managed by Supabase

3. **App Access** (final step)
   - Only authenticated users with beta access see the app

### Testing options:

**Skip beta password in development:**
```
http://localhost:3000?skipBeta=true
```

**Reset beta authorization:**
```javascript
// In browser console:
localStorage.removeItem('betaAuthorized')
```

## 🔧 Configuration Options

### Customize the beta password screen

Edit `src/components/BetaAuth.tsx`:
- Change the title/description
- Modify the styling
- Add your contact information

### Customize the auth modal

Edit `src/app/components/AuthModal.tsx`:
- Change the appearance theme
- Modify button colors
- Add custom branding

### Add user profiles (optional)

The database schema includes a `profiles` table. To auto-create profiles:

1. In Supabase dashboard, go to **SQL Editor**
2. Run this trigger:

```sql
-- Create a trigger to automatically create profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.created_at,
    NEW.updated_at
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger the function every time a user is created
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

## 🚀 Production Deployment

### Update environment variables:

```bash
# Production Supabase URLs
NEXT_PUBLIC_SUPABASE_URL=your_production_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_production_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_production_service_role_key
BETA_ACCESS_PASSWORD=your_production_password
```

### Update Supabase settings:

1. In **Authentication** → **Settings**:
   - Update **Site URL** to your production domain
   - Add production **Redirect URLs**

### Optional: RLS Policies

If you want to add row-level security:

```sql
-- Enable RLS on profiles table
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users can only see their own profile
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);
```

## 🧪 Testing Checklist

- [ ] Beta password screen appears first
- [ ] Correct password allows access to auth screen
- [ ] Incorrect password shows error
- [ ] Auth modal opens when clicking "Sign In / Sign Up"
- [ ] Email magic link is sent
- [ ] Magic link redirects to app and logs user in
- [ ] User session persists on page refresh
- [ ] Sign out works correctly
- [ ] Beta authorization persists in localStorage
- [ ] Test mode works with `?skipBeta=true`

## 🔍 Troubleshooting

### "BETA_ACCESS_PASSWORD not set" error
- Make sure `.env.local` exists and has the variable
- Restart your dev server after adding environment variables

### Magic link not working
- Check your email spam folder
- Verify redirect URLs in Supabase settings
- Make sure Site URL is correct

### User not staying logged in
- Check that auth callback route exists at `/auth/callback`
- Verify Supabase client configuration

### Still seeing auth screen after login
- Check browser console for errors
- Verify Supabase session is being set correctly

## 🎯 Next Steps

Once auth is working:
1. Add user profile management
2. Implement role-based access control
3. Add email verification requirements
4. Set up user analytics
5. Configure password reset flows

Your auth system is now ready! Users will need both the beta password AND a Supabase account to access your app. 
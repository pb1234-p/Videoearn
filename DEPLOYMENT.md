# Deployment Guide for Netlify

This guide will help you deploy the Watch & Earn INR application to Netlify.

## Prerequisites

1. A Netlify account (sign up at https://netlify.com)
2. Your Supabase project credentials (already configured in .env)
3. Google OAuth configured in Supabase

## Step 1: Configure Google OAuth in Supabase

Before deploying, you need to enable Google authentication in your Supabase project:

1. Go to your Supabase Dashboard
2. Navigate to Authentication > Providers
3. Enable Google provider
4. Add your authorized redirect URLs:
   - For development: `http://localhost:3000`
   - For production: `https://your-netlify-app.netlify.app` (you'll get this after deployment)

## Step 2: Deploy to Netlify

### Option A: Deploy via Netlify CLI

1. Install Netlify CLI:
   ```bash
   npm install -g netlify-cli
   ```

2. Login to Netlify:
   ```bash
   netlify login
   ```

3. Deploy the site:
   ```bash
   netlify deploy --prod
   ```

4. Follow the prompts and select the `dist` folder when asked for the publish directory.

### Option B: Deploy via Netlify Web UI

1. Push your code to a Git repository (GitHub, GitLab, or Bitbucket)

2. Go to https://app.netlify.com

3. Click "Add new site" > "Import an existing project"

4. Connect your Git provider and select your repository

5. Configure build settings:
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`

6. Add environment variables:
   - `VITE_SUPABASE_URL`: Your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY`: Your Supabase anon key

7. Click "Deploy site"

## Step 3: Configure Environment Variables

After deployment, go to your Netlify site settings:

1. Navigate to Site settings > Environment variables
2. Add the following variables:
   - `VITE_SUPABASE_URL`: `https://0ec90b57d6e95fcbda19832f.supabase.co`
   - `VITE_SUPABASE_ANON_KEY`: Your Supabase anon key from .env file

3. Redeploy the site for changes to take effect

## Step 4: Update Supabase Redirect URLs

After your site is deployed:

1. Copy your Netlify site URL (e.g., `https://your-app.netlify.app`)
2. Go back to Supabase Dashboard > Authentication > URL Configuration
3. Add your Netlify URL to the allowed redirect URLs:
   - `https://your-app.netlify.app/**`

## Step 5: Test Your Deployment

1. Visit your Netlify site URL
2. Try logging in with Google
3. Test video watching and earning functionality
4. Verify admin panel access (for admin@example.com)

## Troubleshooting

### Build Fails
- Check that all environment variables are set correctly
- Ensure Node.js version is 18 or higher
- Clear Netlify cache and retry deployment

### Google Login Not Working
- Verify Google OAuth is enabled in Supabase
- Check that redirect URLs are correctly configured
- Ensure environment variables are set in Netlify

### Database Errors
- Verify your Supabase database tables are created
- Check that RLS policies are properly configured
- Ensure the admin email in constants.ts matches your email

## Admin Access

The admin panel is accessible at `/admin` route. The admin email is configured as `beatd5513@gmail.com` in the code. Update this in `src/constants.ts` if needed.

## Custom Domain (Optional)

To add a custom domain:

1. Go to Netlify Dashboard > Domain settings
2. Click "Add custom domain"
3. Follow the instructions to configure DNS
4. Update the redirect URLs in Supabase to include your custom domain

## Support

For issues or questions:
- Check Netlify build logs for deployment errors
- Review Supabase logs for database issues
- Verify all environment variables are correctly set

import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as FacebookStrategy } from 'passport-facebook';
import { Strategy as LinkedInStrategy } from 'passport-linkedin-oauth2';
import { Strategy as GitHubStrategy } from 'passport-github2';
import { Strategy as TwitterStrategy } from 'passport-twitter';

const CALLBACK_BASE = (process.env.BACKEND_PUBLIC_URL || `http://localhost:${process.env.PORT || 5000}`).replace(/\/$/, '');

const roleFromState = (rawState) => {
  const value = String(rawState || '').toLowerCase();
  if (value === 'admin') return 'Admin';
  if (value === 'walker' || value === 'guide') return 'Walker';
  return 'Walkee';
};

const normalizeProfile = (provider, req, profile) => {
  const fullName = profile?.displayName
    || [profile?.name?.givenName, profile?.name?.familyName].filter(Boolean).join(' ')
    || null;

  return {
    provider,
    providerId: profile?.id || null,
    email: profile?.emails?.[0]?.value || null,
    name: fullName,
    role_name: roleFromState(req?.query?.state)
  };
};

const registerStrategy = (provider, enabled, strategyBuilder) => {
  if (!enabled) return;
  passport.use(provider, strategyBuilder());
};

export const setupOAuthProviders = () => {
  registerStrategy(
    'google',
    Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    () => new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: `${CALLBACK_BASE}/api/auth/oauth/google/callback`,
        passReqToCallback: true
      },
      async (req, accessToken, refreshToken, profile, done) => {
        done(null, normalizeProfile('google', req, profile));
      }
    )
  );

  registerStrategy(
    'facebook',
    Boolean(process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET),
    () => new FacebookStrategy(
      {
        clientID: process.env.FACEBOOK_APP_ID,
        clientSecret: process.env.FACEBOOK_APP_SECRET,
        callbackURL: `${CALLBACK_BASE}/api/auth/oauth/facebook/callback`,
        profileFields: ['id', 'emails', 'name', 'displayName'],
        enableProof: true,
        passReqToCallback: true
      },
      async (req, accessToken, refreshToken, profile, done) => {
        done(null, normalizeProfile('facebook', req, profile));
      }
    )
  );

  registerStrategy(
    'linkedin',
    Boolean(process.env.LINKEDIN_CLIENT_ID && process.env.LINKEDIN_CLIENT_SECRET),
    () => new LinkedInStrategy(
      {
        clientID: process.env.LINKEDIN_CLIENT_ID,
        clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
        callbackURL: `${CALLBACK_BASE}/api/auth/oauth/linkedin/callback`,
        scope: ['r_liteprofile', 'r_emailaddress'],
        state: true,
        passReqToCallback: true
      },
      async (req, accessToken, refreshToken, profile, done) => {
        done(null, normalizeProfile('linkedin', req, profile));
      }
    )
  );

  registerStrategy(
    'github',
    Boolean(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET),
    () => new GitHubStrategy(
      {
        clientID: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        callbackURL: `${CALLBACK_BASE}/api/auth/oauth/github/callback`,
        passReqToCallback: true
      },
      async (req, accessToken, refreshToken, profile, done) => {
        done(null, normalizeProfile('github', req, profile));
      }
    )
  );

  registerStrategy(
    'twitter',
    Boolean(process.env.TWITTER_CONSUMER_KEY && process.env.TWITTER_CONSUMER_SECRET),
    () => new TwitterStrategy(
      {
        consumerKey: process.env.TWITTER_CONSUMER_KEY,
        consumerSecret: process.env.TWITTER_CONSUMER_SECRET,
        callbackURL: `${CALLBACK_BASE}/api/auth/oauth/twitter/callback`,
        includeEmail: true,
        passReqToCallback: true
      },
      async (req, token, tokenSecret, profile, done) => {
        done(null, normalizeProfile('twitter', req, profile));
      }
    )
  );
};

export const getConfiguredOAuthProviders = () => {
  const providers = [];
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) providers.push('google');
  if (process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET) providers.push('facebook');
  if (process.env.LINKEDIN_CLIENT_ID && process.env.LINKEDIN_CLIENT_SECRET) providers.push('linkedin');
  if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) providers.push('github');
  if (process.env.TWITTER_CONSUMER_KEY && process.env.TWITTER_CONSUMER_SECRET) providers.push('twitter');
  return providers;
};

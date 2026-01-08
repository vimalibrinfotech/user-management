import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import User from '../models/User.js';

export const configurePassport = () => {
  // Serialize user for session
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  // Deserialize user from session
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id);
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  });

  // Google OAuth Strategy
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          console.log('Google Profile:', profile);

          // Extract user info from Google profile
          const email = profile.emails[0].value;
          const googleId = profile.id;
          const fullName = profile.displayName;
          const photo = profile.photos[0]?.value;

          // Split name into first and last
          const nameParts = fullName.split(' ');
          const firstName = nameParts[0];
          const lastName = nameParts.slice(1).join(' ') || firstName;

          // Check if user exists
          let user = await User.findOne({ email });

          if (user) {
            // User exists - update Google info if not already set
            if (!user.googleId) {
              user.googleId = googleId;
              user.authProvider = 'google';
              if (!user.profilePhoto) {
                user.profilePhoto = photo;
              }
              await user.save();
            }
          } else {
            // Create new user
            user = await User.create({
              firstName,
              lastName,
              email,
              googleId,
              authProvider: 'google',
              profilePhoto: photo,
              password: 'GOOGLE_AUTH', // Placeholder
              phones: [],
              address: 'Not provided',
              role: 'user'
            });
          }

          return done(null, user);
        } catch (error) {
          console.error('Google OAuth Error:', error);
          return done(error, null);
        }
      }
    )
  );
};

export default passport;
import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy, VerifyCallback, Profile } from "passport-google-oauth20";

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, "google") {
  constructor() {
    super({
      clientID: process.env.GOOGLE_OAUTH_CLIENT_ID || "not-configured",
      clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET || "not-configured",
      callbackURL: process.env.GOOGLE_OAUTH_CALLBACK_URL || "http://localhost:4000/auth/google/callback",
      scope: ["email", "profile"],
    });
  }

  validate(_accessToken: string, _refreshToken: string, profile: Profile, done: VerifyCallback) {
    const { name, emails, photos, id } = profile;
    const user = {
      googleId: id,
      email: emails?.[0]?.value,
      firstName: name?.givenName ?? "",
      lastName: name?.familyName ?? "",
      photoUrl: photos?.[0]?.value,
    };
    done(null, user);
  }
}

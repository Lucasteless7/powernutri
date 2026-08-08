import { createAuthClient } from "better-auth/react";

// Use the base URL from the Neon config environment variable
export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_NEON_AUTH_URL || "https://ep-mute-cherry-ac9pwv9y.neonauth.sa-east-1.aws.neon.tech/neondb/auth"
});

export const { signIn, signUp, signOut, useSession } = authClient;

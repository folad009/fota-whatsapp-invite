import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password({
      profile(params) {
        if (params.flow === "signUp") {
          throw new Error(
            "Public registration is disabled. Contact an administrator."
          );
        }
        return {
          email: params.email as string,
          name: (params.name as string) ?? "Organizer",
        };
      },
    }),
  ],
});

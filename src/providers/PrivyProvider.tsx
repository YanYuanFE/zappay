import { PrivyProvider as PrivyProviderBase } from "@privy-io/react-auth";

const PRIVY_APP_ID = import.meta.env.VITE_PRIVY_APP_ID as string;

export default function PrivyProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PrivyProviderBase
      appId={PRIVY_APP_ID}
      config={{
        appearance: {
          theme: "light",
          accentColor: "#ec796b",
          logo: undefined,
        },
        loginMethods: ["email", "google", "twitter"],
        embeddedWallets: {
          ethereum: {
            createOnLogin: "off",
          },
        },
      }}
    >
      {children}
    </PrivyProviderBase>
  );
}

import "./globals.css";
import { WalletProvider } from './WalletContext';


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <WalletProvider>
        {children}
        </WalletProvider>
      </body>
    </html>
  );
}

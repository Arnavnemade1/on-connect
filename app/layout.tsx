import "./globals.css";
import { Fraunces, Inter } from "next/font/google";
import Shell from "@/components/Shell";
import { ChatProvider } from "@/lib/chat";
const serif = Fraunces({ subsets: ["latin"], variable: "--serif" });
const sans = Inter({ subsets: ["latin"], variable: "--sans" });
export const metadata = { title: "Onconnect — adaptive medical communication", description: "Personalized pediatric oncology education with transparent adaptation" };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (<html lang="en" className={`${serif.variable} ${sans.variable}`}><body><a className="skip" href="#main">Skip to content</a><ChatProvider><Shell>{children}</Shell></ChatProvider></body></html>);
}

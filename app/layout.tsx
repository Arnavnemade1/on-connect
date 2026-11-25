import "./globals.css";
import { Geist } from "next/font/google";
import Shell from "@/components/Shell";
import { ChatProvider } from "@/lib/chat";
import { SyncProvider } from "@/components/SyncProvider";
const sans = Geist({ subsets: ["latin"], variable: "--sans" });
export const metadata = { title: "Onconnect: medical explanations that adapt to the reader", description: "Personalized pediatric oncology education with transparent adaptation" };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (<html lang="en" data-theme="dark" suppressHydrationWarning className={sans.variable}><head><script dangerouslySetInnerHTML={{ __html: "try{var t=localStorage.getItem('onc.theme');document.documentElement.dataset.theme=(location.pathname==='/'||t!=='light')?'dark':'light'}catch(e){}" }} /></head><body><a className="skip" href="#main">Skip to content</a><SyncProvider><ChatProvider><Shell>{children}</Shell></ChatProvider></SyncProvider></body></html>);
}

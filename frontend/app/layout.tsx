import './globals.css';
import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'ことば | Japanese Reading', description: 'A quiet space to practice Japanese reading.' };
export default function RootLayout({children}:{children:React.ReactNode}) { return <html lang="en"><body>{children}</body></html>; }

import type {Metadata, Viewport} from 'next';
import '../frontend/styles.css';
export const metadata:Metadata={title:'Mellunest — Life in good company',description:'A little more life. A little closer together. Share moments, find your people and keep the conversation going.',icons:{icon:'/favicon.svg'}};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', interactiveWidget: 'resizes-content' };
export default function Layout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}

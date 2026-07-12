import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import { Providers } from './app/providers';
import 'bootstrap-icons/font/bootstrap-icons.css';
import './styles/theme.css';
createRoot(document.getElementById('root')!).render(<StrictMode><Providers><App/></Providers></StrictMode>);

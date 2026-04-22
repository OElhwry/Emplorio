import { createRoot } from 'react-dom/client';
import './popup.css';
import { App } from './App.js';
import { applyTheme, loadTheme } from '../lib/theme.js';

document.documentElement.dataset.theme =
  window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
void loadTheme().then(applyTheme);

const root = document.getElementById('root');
if (root) createRoot(root).render(<App />);

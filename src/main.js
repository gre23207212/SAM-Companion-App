import './vanilla/original.css';
import './vanilla/fonts.css';
import './vanilla/app.css';
import {initTheme} from './lib/theme-store.js';
import {mountApp} from './vanilla/shell.js';
initTheme();
const root=document.getElementById('root');
if(root)mountApp(root);

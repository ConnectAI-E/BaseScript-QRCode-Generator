import './App.css';
import { useEffect } from 'react';
import { bitable, UIBuilder } from "@base-open/web-api";
import callback from './runUIBuilder';
import { useTranslation } from 'react-i18next';


export default function App() {
    const { t } = useTranslation();
    useEffect(() => {
        UIBuilder.getInstance('#container', { bitable, callback: (ui) => callback(ui, t) });
    }, []);
    return (<div className='pageRoot'>
        <div className='mask'></div>
        <div className='logoContainer'>
            <img src='url.png' />
            <img src='txt.png' />
            <img className='arrowImg' src='Arrow.png'/>
            <img src='qrcode.png' />
        </div>
        <div id='container'></div>
    </div >
    );
}
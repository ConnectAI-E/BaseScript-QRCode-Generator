import './App.css';
import { useEffect } from 'react';
import { bitable, UIBuilder } from "@lark-base-open/js-sdk";
import callback from './runUIBuilder';
import { useTranslation } from 'react-i18next';


export default function App() {
  const translation = useTranslation();
  useEffect(() => {
    const uiBuilder = new UIBuilder(document.querySelector('#container') as HTMLElement,
      {
        bitable,
        callback: (ui: any) => (callback(ui, translation.t) as any),
        translation,
      });
    return () => {
      uiBuilder.umount();
    }
  }, [translation]);
  return (<div className='pageRoot'>
    <div className='mask'></div>
    <div className='logoContainer'>
      <img src='url.png' />
      <img src='txt.png' />
      <img className='arrowImg' src='Arrow.png' />
      <img src='qrcode.png' />
    </div>
    <div id='container'></div>
    <div style={{ display: 'none' }}><canvas id="barcode"></canvas></div>
  </div >
  );
}
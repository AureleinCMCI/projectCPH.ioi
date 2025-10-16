import Quagga from '@ericblade/quagga2';
import { useEffect, useRef, useState } from 'react';

const Scanner = () => {
  const scannerRef = useRef<HTMLDivElement>(null);
  const [barcode, setBarcode] = useState<string | null>(null);

  useEffect(() => {
    async function startScanner() {
      if (!scannerRef.current) return;
  
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      let rearCamera = videoDevices.find(device => /back|rear|environment/gi.test(device.label));
      if (!rearCamera) {
        rearCamera = videoDevices[0]; // fallback
      }
  
      Quagga.init({
        inputStream: {
          name: "Live",
          type: "LiveStream",
          target: scannerRef.current,
          constraints: {
            deviceId: rearCamera.deviceId
          }
        },
        decoder: {
          readers: ["code_128_reader", "ean_reader", "ean_8_reader", "upc_reader"],
        },
      }, err => {
        if (err) {
          console.error(err);
          return;
        }
        Quagga.start();
      });
  
      Quagga.onDetected(data => {
        if(data.codeResult?.code) {
          setBarcode(data.codeResult.code);
          Quagga.stop();
        }
      });
    }
    startScanner();
    return () => {
      Quagga.stop();
      Quagga.offDetected();
    }
  }, []);
  

  return (
    <div>
      <div ref={scannerRef} style={{ width: '100%', height: '300px' }} />
      {barcode && <p>Code barre détecté : {barcode}</p>}
    </div>
  );
};

export default Scanner;

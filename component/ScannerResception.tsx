'use client';

import Quagga, { QuaggaJSResultCallbackFunction, QuaggaJSResultObject } from '@ericblade/quagga2';
import { Button, Center, Loader, Modal, Paper, Text, Textarea, TextInput } from '@mantine/core';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { jwtDecode } from 'jwt-decode';
import { useCallback, useEffect, useRef, useState } from 'react';
import styles from './style/monCompte.module.css';
import scannerStyles from './style/ScannerResception.module.css';

type InventaireItem = { id: number; livre_id: number; title: string; author: string; quantite: number; price: number; isbn: number; livre?: { image?: string };};

export default function Resception() {
  // États pour le formulaire d'ajout
  const [formOpened, setFormOpened] = useState(false);
  const [result, setResult] = useState('');
  const [scannerOpened, setScannerOpened] = useState(false);
  const [scannerReady, setScannerReady] = useState(false);
  const scannerRef = useRef<HTMLDivElement | null>(null);
  const [search, setSearch] = useState('');
  
  // États pour la détection des plateformes
  const [isMobile, setIsMobile] = useState(false);
  const [scanner, setScanner] = useState<Html5QrcodeScanner | boolean | null>(null);
  const [scannerType, setScannerType] = useState<'html5' | 'quagga'>('html5');

  const [formData, setFormData] = useState({title: '',author: '', price: '', quantite: '', isbn: '', description: '', image: '', livre_id: '', livre_title: '',  name_user: '',   info: '',  user_id: '', date_reception: '',});
  const [inventaire, setInventaire] = useState<InventaireItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const [detailsOpened, setDetailsOpened] = useState(false);
  const [ajouts, setAjouts] = useState<{ [id: number]: number }>({});
  const [editedBooks, setEditedBooks] = useState<InventaireItem[]>([]);

  const [isbn, setIsbn] = useState('');
  const [showPopover, setShowPopover] = useState(false);

  // Ajouter un nouvel état pour la liste des codes scannés
  const [scannedCodes, setScannedCodes] = useState<string[]>([]);
  const [showCodesList, setShowCodesList] = useState(false);

  const setScannerNode = useCallback((node: HTMLDivElement | null) => {
    scannerRef.current = node;
    setScannerReady(!!node);
  }, []);

  // Détection automatique du type d'appareil et choix du scanner
  useEffect(() => {
    const detectMobileAndScanner = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      const isAndroid = /android/.test(userAgent);
      const isIOS = /iphone|ipad|ipod/.test(userAgent);
      
      setIsMobile(isAndroid || isIOS);
      
      // Choix du scanner selon l'OS
      if (isIOS) {
        setScannerType('quagga'); // QuaggaJS pour iOS
        console.log('📱 iOS détecté → Scanner QuaggaJS sélectionné');
      } else {
        setScannerType('html5'); // html5-qrcode pour Android/Desktop
        console.log('🤖 Android/Desktop détecté → Scanner html5-qrcode sélectionné');
      }
    };
    
    detectMobileAndScanner();
  }, []);

  // Gestionnaires pour html5-qrcode
  const handleScan = async (decodedText: string) => {
    if (decodedText) {
      console.log('✅ Code scanné:', decodedText);
      
      // Ajouter le code à la liste s'il n'y est pas déjà
      setScannedCodes(prev => {
        if (!prev.includes(decodedText)) {
          const newCodes = [...prev, decodedText];
          console.log('📋 Codes scannés:', newCodes);
          setShowCodesList(true); // Afficher immédiatement
          return newCodes;
        }
        return prev;
      });
      
      // ❌ NE PAS fermer le scanner ici !
      // Le scanner continue à tourner
    }
  };

  const handleError = (errorMessage: string) => {
    console.error('Erreur de scan:', errorMessage);
  };

  // Fonction pour valider un code choisi
  const validateSelectedCode = async (selectedCode: string) => {
    console.log('🎯 Code sélectionné:', selectedCode);
    
    // Arrêter le scanner maintenant
    if (scannerType === 'quagga' || scannerType === 'html5') {

      Quagga.stop();
    }
    
    // Vérifier si l'ISBN existe en stock
    const livre = inventaire.find(item => item.isbn.toString() === selectedCode.trim());
    
    if (livre) {
      setEditedBooks([livre]);
      setAjouts({ [livre.id]: 0 });
      
      setScannerOpened(false);
      setShowCodesList(false);
      setScannedCodes([]);
      
      setTimeout(() => setDetailsOpened(true), 500);
    } else {
      alert(`ISBN ${selectedCode} - Livre pas en stock !`);
      setFormData(prev => ({ ...prev, isbn: selectedCode }));
      
      setScannerOpened(false);
      setShowCodesList(false);
      setScannedCodes([]);
      
      setTimeout(() => setFormOpened(true), 500);
    }
  };

  // Initialisation scanner adaptatif (html5-qrcode OU QuaggaJS)
  useEffect(() => {
    if (scannerOpened && scannerReady && scannerRef.current) {
      console.log(`Scanner ${scannerType} prêt à être utilisé`);
      
      if (scannerType === 'html5') {
        // ANDROID/DESKTOP : html5-qrcode
        const html5QrcodeScanner = new Html5QrcodeScanner(
          "reader",
          { 
            fps: 10, 
            aspectRatio: 2.5,
            videoConstraints: {
              facingMode: 'environment'
            }
          },
          false
        );

        html5QrcodeScanner.render(handleScan, handleError);
        setScanner(html5QrcodeScanner);

        return () => {
          if (html5QrcodeScanner) {
            html5QrcodeScanner.clear();
          }
        };
      } else {
        Quagga.init({
          inputStream: {
            name: "Live",
            type: "LiveStream",
            target: document.getElementById('reader') as HTMLElement,
            constraints: {
              width: { min: 640, ideal: 1280 },
              height: { min: 480, ideal: 720 },
              facingMode: "environment"
            }
          },
          decoder: {
            readers: [
              "ean_reader",
              "ean_8_reader",
              "code_128_reader",
              "code_39_reader",
              "codabar_reader",
              "i2of5_reader"
            ]
          },
          locate: false,
          locator: {
            patchSize: "large",
            halfSample: true
          },
          numOfWorkers: 2,
          frequency: 10
        }, (err) => {
          if (err) {
            console.error('Erreur initialisation Quagga:', err);
            handleError(err.message);
            return;
          }
          console.log("✅ QuaggaJS initialisé avec succès");
          Quagga.start();
          setScanner(true);
        });
        const onDetected = (result: QuaggaJSResultObject) => {  
          const code = result.codeResult.code;
          console.log('Code détecté par Quagga:', code);
          if (code) {
            handleScan(code);
          }
        };
        Quagga.onDetected(onDetected);
        return () => {
          console.log('Nettoyage QuaggaJS...');
          Quagga.offDetected(onDetected as QuaggaJSResultCallbackFunction);
          Quagga.stop();
          setScanner(null);
        };
      }
    }
  }, [scannerOpened, scannerReady, scannerType]);
  useEffect(() => {
    if (!scannerOpened && scanner) {
      console.log('Scanner fermé, nettoyage des ressources...');
      
      if (scannerType === 'html5') {
        (scanner as Html5QrcodeScanner).clear();
      } else {
        Quagga.stop();
      }
      
      setScanner(null);
    }
  }, [scannerOpened, scanner, scannerType]);

  // Récupération de l'inventaire au chargement
  useEffect(() => {
    async function fetchInventaire() {
      setLoading(true);
      try {
        const response = await fetch('/api/inventaire', { method: 'GET' });
        const result = await response.json();
        setInventaire(result.data || []);
      } catch {
        setInventaire([]);
      } finally {
        setLoading(false);
      }
    }
    fetchInventaire();
  }, []);

  // Gestion du formulaire d'ajout
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      alert("Le titre du livre est obligatoire !");
      return;
    }
    if (!formData.author.trim()) {
      alert("L'auteur est obligatoire !");
      return;
    }
    if (!formData.isbn.trim()) {
      alert("L'ISBN est obligatoire !");
      return;
    }
    try {
      // 1. Créer le livre (avec image)
      const livreRes = await fetch('/api/livre', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: String(formData.title),
          author: String(formData.author),
          description: formData.description,
          isbn: String(formData.isbn),
          image: capturedImage
        }),
      });
      const livreData = await livreRes.json();
      const livreId = livreData?.user?.id;
      if (!livreId) {
        alert("Erreur lors de la création du livre");
        return;
      }

      // 2. Créer l'inventaire lié à ce livre
      const inventaireRes = await fetch('/api/inventaire', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          livre_id: livreId,
          title: String(formData.title),
          author: String(formData.author),
          quantite: Number(formData.quantite),
          price: Number(formData.price),
          isbn: String(formData.isbn)
        }),
      });

      if (!inventaireRes.ok) {
        const errorData = await inventaireRes.json();
        alert(`Erreur lors de l'ajout au stock: ${errorData.error || 'Erreur inconnue'}`);
        return;
      }

      // 3. Ajouter une ligne dans la table reception (historique)
      if (!user) {
        alert("Utilisateur non connecté !");
        return;
      }
      await fetch('/api/historiqueResception', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          quantite: Number(formData.quantite),
          name_user: user.name,
          livre_id: livreId,
          info: 0,
          livre_title: formData.title
        }),
      });

      alert("Livre, inventaire et réception ajoutés avec succès !");
      setFormOpened(false);
      setFormData({  title: '',   author: '', price: '',  quantite: '',   isbn: '',   description: '',  image: '', livre_id: '', livre_title: '',  name_user: '',   info: '',  user_id: '', date_reception: '' });
      setResult('');
      setCapturedImage('');

      // Rafraîchir l'inventaire après ajout
      setLoading(true);
      const response = await fetch('/api/inventaire', { method: 'GET' });
      const result = await response.json();
      setInventaire(result.data || []);
      setLoading(false);

    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur de connexion. Veuillez réessayer.');
    }
  };





  const handleAjoutChange = (id: number, value: string) => {
    setAjouts(prev => ({
      ...prev,
      [id]: Number(value)
    }));
  };

  const handleIsbnChange = (id: number, newIsbn: string) => {
    setEditedBooks(prev =>
      prev.map(book =>
        book.id === id ? { ...book, isbn: Number(newIsbn) } : book
      )
    );
  };

  /*ajout dans l'inventaire si l'isbn est différent de l'isbn du livre*/
  const isbnDiférentAjoutLigne = async (livre: InventaireItem) => {
    try {
      // Vérifie que nous avons les données nécessaires
      if (!livre.isbn || !livre.livre_id) {
        alert("ISBN ou livre_id manquant !");
        return;
      }

      const res = await fetch('/api/isbn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          isbn: livre.isbn,
          livre_id: livre.livre_id
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Erreur lors de l\'ajout de l\'ISBN');
      }

      alert(`ISBN ${livre.isbn} ajouté avec succès pour le livre ID ${livre.livre_id} !`);
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de l\'ajout de l\'ISBN');
    }
  }
  /*ajout dans l'inventaire */
  const incrementInventaire = async (livre: InventaireItem, ajout: number) => {
    if (!ajout || ajout === 0) {
      alert("Veuillez saisir une quantité à ajouter supérieure à 0.");
      return;
    }
    if (!livre.title) {
      alert("Le titre du livre est manquant !");
      return;
    }
    try {
      setLoading(true);

      // Si l'ISBN est différent, on l'ajoute d'abord
      if (livre.isbn.toString() !== inventaire.find(item => item.id === livre.id)?.isbn.toString()) {
        await isbnDiférentAjoutLigne(livre);
      }

      const res = await fetch('/api/ScannerResception', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: livre.id, ajout, isbn: livre.isbn }),
      });
      if (!res.ok) throw new Error('Erreur lors de l\'incrémentation');

      await fetch('/api/historiqueResception', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user?.id || null  ,
          quantite: ajout,
          name_user: user?.name || 'Inconnu',
          livre_id: livre.livre_id,
          livre_title: livre.title,
          info: 0
        }),
      });

      const response = await fetch('/api/inventaire', { method: 'GET' });
      const result = await response.json();
      setInventaire(result.data || []);
      setLoading(false);
      alert(`Quantité du livre "${livre.title}" incrémentée de ${ajout} !`);
    } catch (error) {
      console.error('Erreur:', error);
      setLoading(false);
      alert('Erreur lors de l\'incrémentation');
    }
  };



  const filteredInventaire = inventaire.filter((item) =>
    (item.title ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (item.author ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const [showCamera, setShowCamera] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [capturedImage, setCapturedImage] = useState('');
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');

  useEffect(() => {
    if (showCamera && videoRef.current) {
      navigator.mediaDevices.getUserMedia({ video: { facingMode } }).then(stream => {
        if (videoRef.current) videoRef.current.srcObject = stream;
      });
    }
    const localVideo = videoRef.current;
    return () => {
      if (localVideo && localVideo.srcObject) {
        (localVideo.srcObject as MediaStream).getTracks().forEach(track => track.stop());
      }
    };
  }, [showCamera, facingMode]);

  const handleCapture = () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg');
    setCapturedImage(dataUrl);
    setFormData(prev => ({ ...prev, image: dataUrl }));
    setShowCamera(false);
    if (video.srcObject) {
      (video.srcObject as MediaStream).getTracks().forEach(track => track.stop());
    }
  };

  let user: { id: string; name: string; avatar?: string } | null = null;
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('jwt');
    if (token) {
      try {
        user = jwtDecode<{ id: string; name: string; avatar?: string }>(token);
      } catch {}
    }
  }

  // Ajouter cette fonction pour valider tous les codes
  const validateAllScannedCodes = () => {
    console.log('🔍 Vérification de tous les codes scannés...', scannedCodes);
    
    // Chercher si AU MOINS UN ISBN existe dans la base de données
    let livreFound = null;
    
    for (const code of scannedCodes) {
      const livre = inventaire.find(item => item.isbn.toString() === code.trim());
      
      if (livre) {
        livreFound = livre;
        break; // Arrêter dès qu'on trouve un match
      }
    }
    
    // Fermer le scanner
    if (scannerType === 'quagga') {
      Quagga.stop();
    }
    setScannerOpened(false);
    setShowCodesList(false);
    setScannedCodes([]);
    
    // Décider automatiquement
    if (livreFound) {
      alert(`✅ Livre trouvé : ${livreFound.title}`);
      setEditedBooks([livreFound]);
      setAjouts({ [livreFound.id]: 0 });
      setTimeout(() => setDetailsOpened(true), 500);
    } else {
      alert(`❌ Aucun livre trouvé en stock`);
      setFormData(prev => ({ ...prev, isbn: scannedCodes[0] || '' }));
      setTimeout(() => setFormOpened(true), 500);
    }
  };

  return (
    <div className={styles.revolutStyle}>
      {/* Section montant principal */}
      <div className={styles.revolutAmount}>
        <div className={styles.revolutLabel}>Scanner Réception</div>
        <div className={styles.revolutValue}>{inventaire.length}</div>
        <div className={styles.revolutQuickActions}>
          <div className={styles.quickAction}>
            <div onClick={() => setScannerOpened(true)} className={styles.revolutdiv}>
              <span>📱</span>
              <div className={styles.quickActionLabel}>Scanner</div>
            </div>
          </div>

          <div className={styles.quickAction}>
            <div onClick={() => setFormOpened(true)} className={styles.revolutButton}>
              <span>➕</span>
              <div className={styles.quickActionLabel}>Ajouter</div>
            </div>
          </div>
        </div>
      </div>

      {/* Barre de recherche */}
      <div style={{ padding: '0 20px', marginBottom: '20px' }}>
        <TextInput
          placeholder="Rechercher un livre..."
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
          className={styles.searchInput}
        />
      </div>

      {/* Liste des livres */}
      <div className={styles.transactionsList}>
        {loading ? (
          <Center>
            <Loader />
          </Center>
        ) : (
          filteredInventaire.map((item) => (
            <div key={item.id} className={styles.transaction}>
              <div className={styles.transactionIcon}>📚</div>
              <div className={styles.transactionInfo}>
                <div className={styles.transactionTitle}>{item.title}</div>
                <div className={styles.transactionTime}>
                  👤 {item.author} | 📖 ISBN: {item.isbn}
                </div>
              </div>
              <div className={styles.transactionAmount}>
                <div style={{ fontSize: '14px', fontWeight: 'bold' }}>
                  {item.quantite}x
                </div>
                <div style={{ fontSize: '12px', color: '#666' }}>
                  {item.price}€
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Scanner en DIV plein écran - AUCUNE compression */}
      {scannerOpened && (
          <div className={scannerStyles.scannerFullScreen}>
            {/* Header avec bouton fermer */}
            <div className={scannerStyles.scannerHeader}>
              <Text className={scannerStyles.scannerTitle}>
                📱 Scanner ISBN
              </Text>
              <Button onClick={() => setScannerOpened(false)}  variant="filled"   color="red"size="sm"  >
                ✕ Fermer
              </Button>
            </div>
            
            {/* Modal de confirmation ISBN */}
            {showPopover && (
                             <div className={scannerStyles.popover}>
                <div style={{ fontSize: '24px', marginBottom: '10px' }}>📚</div>
                <div style={{ fontSize: '16px', marginBottom: '8px' }}>ISBN détecté :</div>
                <div style={{ 
                  fontSize: '20px', 
                  color: '#4CAF50', 
                  fontFamily: 'monospace',
                  fontWeight: 'bold',
                  marginBottom: '15px'
                }}>
                  {result}
                </div>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                  <Button 
                    onClick={() => {
                      setShowPopover(false);
                      setScannerOpened(false);
                      setFormOpened(true);
                    }}
                    color="green"
                    size="sm"
                  >
                    ✓ Valider
                  </Button>
                  <Button 
                    onClick={() => setShowPopover(false)}
                    color="gray"
                    size="sm"
                  >
                    ✕ Annuler
                  </Button>
                </div>
              </div>
            )}
            <div ref={setScannerNode} className={scannerStyles.cameraContainer}>
              <div id="reader" className={scannerStyles.reader}></div>
              
              {/* 📱 LISTE TRANSPARENTE EN TEMPS RÉEL - OVERLAY SUR LA CAMÉRA */}
              {showCodesList && scannedCodes.length > 0 && (
                <div className={scannerStyles.liveCodesList}>
                  <div className={scannerStyles.liveCodesHeader}>
                    <Text size="sm" c="white" fw={600}>
                      📋 {scannedCodes.length} code{scannedCodes.length > 1 ? 's' : ''} détecté{scannedCodes.length > 1 ? 's' : ''}
                    </Text>
                  </div>
                  
                  <div className={scannerStyles.liveCodesContainer}>
                    {scannedCodes.map((code, index) => (
                      <div key={index} className={scannerStyles.liveCodeItem}>
                        <Text size="xs" c="white" className={scannerStyles.liveCodeText}>
                          📚 {code}
                        </Text>
                      </div>
                    ))}
                  </div>
                  <div className={scannerStyles.liveCodesFooter}>
                    <Button 
                      size="sm"
                      color="blue"
                      onClick={validateAllScannedCodes} // ← Utiliser la fonction qui vérifie TOUS les codes
                      style={{ 
                        marginBottom: '8px', 
                        width: '100%',
                        fontWeight: 'bold'
                      }}
                    >
                      ✅ VALIDER TOUS LES CODES
                    </Button>
                    
                    <Button 
                      size="xs"
                      variant="outline"
                      color="white"
                      onClick={() => {
                        setScannedCodes([]);
                        setShowCodesList(false);
                      }}
                    >
                      🗑️ Vider
                    </Button>
                  </div>
                </div>
              )}
            </div>
            
            {/* Panneau d'informations en bas */}
            <div className={scannerStyles.infoPanel}>
              {/* <div className={styles.statusContainer}>
                <div className={`${styles.statusBadge} ${result ? styles.statusBadgeSuccess : ''}`}>
                  {result ? `📚 ISBN: ${result}` : '🔍 Visez le code-barres'}
                </div> */}
              {/* </div> */}
              
              <div className={scannerStyles.controlsContainer}>
                <TextInput
                  placeholder="ISBN manuel"
                  value={isbn}
                  onChange={(e) => setIsbn(e.target.value)}
                  className={scannerStyles.isbnInput}
                  styles={{
                    input: { backgroundColor: 'white', color: 'black' }
                  }}
                />
                <Button 
                  onClick={() => {setScannerOpened(false);setFormOpened(true);}} disabled={!isbn}color="green"size="md">
                  ✓ Valider
                </Button>
              </div>
              
            </div>
          </div>
      )}

      {/* Formulaire d'ajout */}
      <Modal 
        opened={formOpened} 
        onClose={() => setFormOpened(false)} 
        title="Ajouter ou incrémenter un livre" 
        centered 
        size={isMobile ? "xs" : "xl"}
      >
        <form onSubmit={handleFormSubmit} style={{ 
          width: isMobile ? '100%' : '600px', 
          maxWidth: '90vw', 
          margin: '0 auto' 
        }} className={isMobile ? styles.iosModalContent : ''}>
          <TextInput 
            label="ISBN" 
            name="isbn" 
            value={formData.isbn} 
            onChange={handleFormChange} 
            required 
            mb="sm"
            classNames={isMobile ? { input: styles.iosModalInput } : undefined}
          />
          <TextInput 
            label="Titre du livre" 
            name="title" 
            value={formData.title} 
            onChange={handleFormChange} 
            required 
            mb="sm" 
            classNames={isMobile ? { input: styles.iosModalInput } : undefined}
          />
          <TextInput 
            label="Auteur" 
            name="author" 
            value={formData.author} 
            onChange={handleFormChange} 
            required 
            mb="sm" 
            classNames={isMobile ? { input: styles.iosModalInput } : undefined}
          />
          <Textarea 
            label="Description" 
            name="description" 
            value={formData.description} 
            onChange={handleFormChange} 
            minRows={1} 
            mb="sm" 
            classNames={isMobile ? { input: styles.iosModalInput } : undefined}
          />
          <TextInput 
            label="Prix" 
            name="price" 
            value={formData.price} 
            onChange={handleFormChange} 
            required 
            mb="sm" 
            classNames={isMobile ? { input: styles.iosModalInput } : undefined}
          />
          <TextInput 
            label="Quantité" 
            name="quantite" 
            value={formData.quantite} 
            onChange={handleFormChange} 
            required 
            mb="sm"
            classNames={isMobile ? { input: styles.iosModalInput } : undefined}
          />
          <Button 
            mt="sm" 
            onClick={e => { e.preventDefault(); setShowCamera(true); }}
            className={isMobile ? styles.iosModalButton : ''}
          >
            Prendre une photo
          </Button>
          {showCamera && (
            <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <video ref={videoRef} autoPlay style={{ width: 320, height: 240, borderRadius: 12, background: '#000' }} />
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: 16, gap: 24 }}>
                <Button variant="outline" color="gray" radius="xl" size="md" style={{ width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={e => { e.preventDefault(); setFacingMode(facingMode === 'user' ? 'environment' : 'user'); }} title="Retourner la caméra" >
                  {facingMode === 'user' ? '🔄 Arrière' : '🔄 Avant'}
                </Button>
                <Button color="teal" radius="xl" size="xl" style={{ width: 64, height: 64, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, boxShadow: '0 2px 8px #0002' }} onClick={e => { e.preventDefault(); handleCapture(); }} title="Prendre la photo" >
                  📸
                </Button>
                <Button color="red" radius="xl" size="md" style={{ width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={e => { e.preventDefault(); setShowCamera(false); }} title="Annuler" >
                  ✖
                </Button>
              </div>
            </div>
          )}
          {capturedImage && (
            <div style={{ marginTop: 10 }}>
              <Text size="sm" color="dimmed" mb="xs">Aperçu de la photo :</Text>
              <img src={capturedImage} alt="Aperçu" style={{ width: 150, borderRadius: 8 }} />
            </div>
          )}
          <Center h={100}>
            <Button 
              mt="sm" 
              type="submit"
              className={isMobile ? styles.iosModalButton : ''}
            >
              Ajouter / Incrémenter
            </Button>
          </Center>
        </form>
      </Modal>

      {/* Modal détails des livres sélectionnés */}
      <Modal opened={detailsOpened} onClose={() => setDetailsOpened(false)} title="Informations du ou des livres sélectionnés" size="xl" centered>
        {editedBooks.length === 0 ? (
          <Text>Aucun livre sélectionné.</Text>
        ) : (
          editedBooks.map(book => (
            <Paper key={book.id} shadow="xs" p="md" mb="md" withBorder>
              <TextInput label="Titre" value={book.title} readOnly mb="md" />
              <TextInput label="Auteur" value={book.author} readOnly mb="md" />
              <TextInput 
                label="ISBN" 
                value={book.isbn.toString()} 
                onChange={e => handleIsbnChange(book.id, e.target.value)} 
                mb="md"
              />
              <TextInput label="Quantité" value={book.quantite} readOnly mb="md" />
              <TextInput label="Prix" value={book.price.toString()} readOnly mb="md" />
              <TextInput label="Quantité à ajouter" type="number" value={ajouts[book.id] ?? ''} onChange={e => handleAjoutChange(book.id, e.target.value)} mb="md" min={1} />
              <Button mt="md" onClick={() => incrementInventaire(book, ajouts[book.id] || 0)}>
                Valider (incrémenter la quantité)
              </Button>
            </Paper>
          ))
        )}
      </Modal>

      {/* Liste des codes détectés */}
      {showCodesList && scannedCodes.length > 0 && (
        <div className={scannerStyles.codesListPanel}>
          <div className={scannerStyles.codesListHeader}>
            <Text size="lg" fw={600}>📋 Codes détectés ({scannedCodes.length})</Text>
            <Button 
              size="xs" 
              color="gray" 
              onClick={() => {
                setScannedCodes([]);
                setShowCodesList(false);
              }}
            >
              🗑️ Vider
            </Button>
          </div>
          
          <div className={scannerStyles.codesList}>
            {scannedCodes.map((code, index) => (
              <div key={index} className={scannerStyles.codeItem}>
                <Text size="sm" className={scannerStyles.codeText}>
                  📚 {code}
                </Text>
                <Button 
                  size="xs" 
                  color="green"
                  onClick={() => validateSelectedCode(code)}
                >
                  ✓ Choisir
                </Button>
              </div>
            ))}
          </div>
          
          <div className={scannerStyles.codesListFooter}>
            <Button 
              size="sm"
              color="blue"
              onClick={() => {
                setScannerOpened(false);
                setShowCodesList(false);
                setScannedCodes([]);
              }}
            >
              🔄 Terminer le scan
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

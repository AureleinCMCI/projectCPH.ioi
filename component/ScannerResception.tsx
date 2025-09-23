'use client';

import Quagga, { QuaggaJSResultCallbackFunction, QuaggaJSResultObject } from '@ericblade/quagga2';
import { Button, Center, Loader, Modal, Paper, Text, Textarea, TextInput } from '@mantine/core';
import { IconCamera, IconEdit } from '@tabler/icons-react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { jwtDecode } from 'jwt-decode';
import { useCallback, useEffect, useRef, useState } from 'react';

import { default as scannerStyles, default as styles } from './style/ScannerResception.module.css';

type InventaireItem = { id: number; livre_id: number; title: string; author: string; quantite: number; price: number; isbn: number; livre?: { image?: string };};

// Interface pour BarcodeDetector (API native du navigateur)
interface BarcodeDetectorInterface {
  new (options: { formats: string[] }): {
    detect(video: HTMLVideoElement): Promise<Array<{ rawValue: string }>>;
  };
}

/* Configuration scanner ultra-rapide pour ISBN */
const SCANNER_CONFIG = {
  // Fréquence de scan ultra-élevée
  fps: 30, // Augmenté de 10 à 30 fps
  frequency: 30, // QuaggaJS - scan toutes les 33ms
  // Délai minimal entre détections (évite les doublons)
  debounceDelay: 100, // 100ms entre chaque scan valide
  // Timeout pour validation rapide
  validationTimeout: 50, // 50ms pour valider un ISBN
  // Nombre de workers pour QuaggaJS
  workers: 4, // Augmenté de 2 à 4 workers
  // Seuil de confiance pour accepter un scan
  confidenceThreshold: 0.7
};

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

  const [formData, setFormData] = useState({
    title: '', author: '', price: '', quantite: '', isbn: '', 
    description: '', image: '', livre_id: '', livre_title: '', 
    name_user: '', info: '', user_id: '', date_reception: '',
    date_de_production: '', additionalIsbns: [] as string[] // Nouveau champ pour les ISBNs additionnels
  });
  const [inventaire, setInventaire] = useState<InventaireItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const [detailsOpened, setDetailsOpened] = useState(false);
  const [ajouts, setAjouts] = useState<{ [id: number]: number }>({});
  const [editedBooks, setEditedBooks] = useState<InventaireItem[]>([]);

  const [isbn, setIsbn] = useState('');
  const [showPopover, setShowPopover] = useState(false);
  
  // États pour la popup d'incrémentation (comme dans commande.tsx)
  const [incrementModalOpened, setIncrementModalOpened] = useState(false);
  const [quantiteToAdd, setQuantiteToAdd] = useState<number>(1);

  // États pour la modale de détails du livre (nouvelle fonctionnalité)
  const [bookDetailsModalOpened, setBookDetailsModalOpened] = useState(false);
  const [selectedBook, setSelectedBook] = useState<InventaireItem | null>(null);
  const [inventaireModalOpened, setInventaireModalOpened] = useState(false);
  
  // États pour l'ajout de plusieurs ISBN dans la modale
  const [newIsbn, setNewIsbn] = useState('');
  const [bookAdditionalIsbns, setBookAdditionalIsbns] = useState<string[]>([]);
  const [isAddingIsbn, setIsAddingIsbn] = useState(false);
  
  // État pour le mode édition de la quantité
  const [isEditingQuantity, setIsEditingQuantity] = useState(false);
  const [tempQuantity, setTempQuantity] = useState<number>(0);

  // Fonctions pour gérer l'édition de la quantité
  const handleEditQuantity = () => {
    if (selectedBook) {
      setTempQuantity(selectedBook.quantite);
      setIsEditingQuantity(true);
    }
  };

  const handleSaveQuantity = async () => {
    if (!selectedBook) return;
    
    try {
      const response = await fetch('/api/ScannerResception', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          id: selectedBook.id, 
          ajout: tempQuantity - selectedBook.quantite 
        }),
      });

      if (response.ok) {
        // Mettre à jour l'état local
        setSelectedBook(prev => prev ? { ...prev, quantite: tempQuantity } : null);
        setInventaire(prev => prev.map(book => 
          book.id === selectedBook.id ? { ...book, quantite: tempQuantity } : book
        ));
        setIsEditingQuantity(false);
        alert('Quantité mise à jour avec succès !');
      } else {
        throw new Error('Erreur lors de la mise à jour');
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de la mise à jour de la quantité');
    }
  };

  const handleCancelEdit = () => {
    setIsEditingQuantity(false);
    setTempQuantity(0);
  };

  // Fonction pour ajouter un nouvel ISBN au livre sélectionné
  const addIsbnToBook = async () => {
    if (!selectedBook || !newIsbn.trim()) {
      alert('Veuillez saisir un ISBN valide');
      return;
    }

    const cleanIsbn = newIsbn.trim();
    
    // Vérifier si l'ISBN n'existe pas déjà dans la liste complète
    if (bookAdditionalIsbns.includes(cleanIsbn)) {
      alert('Cet ISBN existe déjà pour ce livre');
      return;
    }

    setIsAddingIsbn(true);
    try {
      // Appeler l'API pour ajouter l'ISBN
      const response = await fetch('/api/isbn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          isbn: cleanIsbn,
          livre_id: selectedBook.livre_id
        }),
      });

      if (response.ok) {
        // Ajouter à la liste locale
        setBookAdditionalIsbns(prev => [...prev, cleanIsbn]);
        setNewIsbn('');
        alert('✅ ISBN ajouté avec succès !');
      } else {
        throw new Error('Erreur lors de l\'ajout');
      }
    } catch (error) {
      console.error('Erreur lors de l\'ajout de l\'ISBN:', error);
      alert('❌ Erreur lors de l\'ajout de l\'ISBN');
    } finally {
      setIsAddingIsbn(false);
    }
  };
  // Fonction pour charger les ISBN existants depuis la base de données
  const loadExistingIsbns = async (livre_id: number) => {
    try {
      const response = await fetch(`/api/isbn?livre_id=${livre_id}`);
      if (response.ok) {
        const result = await response.json();
        const isbns = result.data || [];
        // Récupérer TOUS les ISBN pour ce livre (y compris le principal)
        const allIsbns = isbns.map((item: { isbn: number }) => item.isbn.toString());
        setBookAdditionalIsbns(allIsbns);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des ISBN:', error);
    }
  };

  // Plus de fonction de suppression - on garde tous les ISBN !

  // Ajouter un nouvel état pour la liste des codes scannés
  const [scannedCodes, setScannedCodes] = useState<string[]>([]);
  const [showCodesList, setShowCodesList] = useState(false);
  const [isbnList, setIsbnList] = useState<{ isbn: number; livre_id: number }[]>([]);

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
  /*ouvrir automatiquement le formulaire d'ajout si autoOpenForm est true*/

  
  useEffect(() => {
    const autoOpenForm = localStorage.getItem('autoOpenForm');
    
    if (autoOpenForm === 'true') {
      // Récupérer tous les ISBNs scannés (depuis commande.tsx ou scanner direct)
      const scannedIsbns = localStorage.getItem('scannedIsbns');
      const IsbnScanner = localStorage.getItem('IsbnScanner');
      
      let isbns: string[] = [];
      
      if (scannedIsbns) {
        // ISBNs venant de commande.tsx (format JSON)
        try {
          isbns = JSON.parse(scannedIsbns);
        } catch (e) {
          console.error('Erreur parsing scannedIsbns:', e);
        }
      } else if (IsbnScanner) {
        // ISBNs venant du scanner direct (format string avec virgules)
        isbns = IsbnScanner.split(', ');
      }
      
      if (isbns.length > 0) {
        setFormData(prev => ({
          ...prev,
          isbn: isbns[0] || '', // Premier ISBN comme ISBN principal
          additionalIsbns: isbns.slice(1) // Autres ISBNs comme ISBNs additionnels
        }));
      }
      
      // Ouvrir automatiquement le formulaire d'ajout
      setTimeout(() => setFormOpened(true), 500);
      localStorage.removeItem('autoOpenForm');
      localStorage.removeItem('scannedIsbns'); // Nettoyer
      localStorage.removeItem('IsbnScanner'); // Nettoyer
    }
  }, []);



  
  // Vérifier l'ISBN en attente et ouvrir automatiquement le formulaire
  useEffect(() => {
    const checkPendingIsbn = () => {
      const storedIsbn = localStorage.getItem('pendingIsbn');
      const autoOpenForm = localStorage.getItem('autoOpenForm');
      
             if (storedIsbn) {
         setIsbn(storedIsbn);
         setFormData(prev => ({ 
           ...prev, 
           isbn: storedIsbn,
           additionalIsbns: [] // Pas d'ISBNs additionnels pour un ISBN en attente
         }));
         localStorage.removeItem('pendingIsbn'); // Nettoyer
         localStorage.removeItem('autoOpenForm'); // Nettoyer
         console.log('📚 ISBN en attente détecté:', storedIsbn);
        
        // Si autoOpenForm est true, ouvrir automatiquement le formulaire
        if (autoOpenForm === 'true') {
          console.log('🚀 Ouverture automatique du formulaire d\'ajout');
          setTimeout(() => setFormOpened(true), 1000); // Délai pour laisser la page se charger
        }
      }

      // Vérifier le statut admin
      const token = localStorage.getItem('jwt');
      if (token) {
        try {
          const userData = jwtDecode<{ id: string; name: string; admin?: boolean }>(token);
          console.log('👤 Statut admin:', userData.admin);
        } catch {
          console.log('👤 Statut admin: non défini');
        }
      }
    };

    checkPendingIsbn();
  }, []);

  /* Cache pour optimiser les validations ISBN répétées */
  const isbnValidationCache = useRef<Map<string, boolean>>(new Map());
  
  /* Fonction de validation ISBN ultra-rapide avec cache */
  const isValidISBN = (code: string): boolean => {
    // Vérifier le cache d'abord
    if (isbnValidationCache.current.has(code)) {
      return isbnValidationCache.current.get(code)!;
    }
    
    // Nettoyer le code (supprimer espaces, tirets, etc.)
    const cleanCode = code.replace(/[\s-]/g, '');
    
    // Validation rapide de la longueur en premier (plus rapide)
    if (cleanCode.length !== 10 && cleanCode.length !== 13) {
      isbnValidationCache.current.set(code, false);
      return false;
    }
    
    // Vérifier si c'est composé uniquement de chiffres (et éventuellement un X à la fin pour ISBN-10)
    const isNumericWithOptionalX = /^[0-9]{9}[0-9X]$|^[0-9]{13}$/.test(cleanCode);
    
    if (!isNumericWithOptionalX) {
      console.log(`❌ Code rejeté (pas un format ISBN valide): ${code}`);
      isbnValidationCache.current.set(code, false);
      return false;
    }
    
    console.log(`✅ ISBN valide détecté: ${cleanCode} (${cleanCode.length} chiffres)`);
    isbnValidationCache.current.set(code, true);
    return true;
  };

  /* fonctionalité du scan ultra-rapide avec validation ISBN */
  const handleScan = useCallback((decodedText: string) => {
    if (!decodedText) return;
    
    const now = Date.now();
    
    // Debounce : ignorer si même code scanné récemment
    if (decodedText === lastScannedCode.current && 
        now - lastScanTime.current < SCANNER_CONFIG.debounceDelay) {
      return;
    }
    
    lastScanTime.current = now;
    lastScannedCode.current = decodedText;
    
    console.log('⚡ Scan ultra-rapide:', decodedText);
    
    // Validation ISBN ultra-rapide avec timeout
    const validationStart = performance.now();
    const isValid = isValidISBN(decodedText);
    const validationTime = performance.now() - validationStart;
    
    if (validationTime > SCANNER_CONFIG.validationTimeout) {
      console.warn(`⚠️ Validation lente: ${validationTime.toFixed(1)}ms`);
    }
    
    if (!isValid) {
      console.log('⚡ Code rejeté (pas un ISBN)');
      return; // Ignorer les codes qui ne sont pas des ISBN
    }
    
    // Nettoyer le code ISBN
    const cleanISBN = decodedText.replace(/[\s-]/g, '');
    console.log('🚀 ISBN valide scanné ultra-rapide:', cleanISBN);
    
    // Ajouter le code à la liste s'il n'y est pas déjà (optimisé)
    setScannedCodes(prev => {
      if (!prev.includes(cleanISBN)) {
        const newCodes = [...prev, cleanISBN];
        console.log('📋 ISBNs scannés:', newCodes);
        setShowCodesList(true);
        return newCodes;
      }
      return prev;
    });

    // Recherche optimisée dans la base de données
    const searchStart = performance.now();
    const isbnTrouve = isbnList.find(item => item.isbn.toString() === cleanISBN);
    const searchTime = performance.now() - searchStart;
    
    console.log(`🔍 Recherche BD: ${searchTime.toFixed(1)}ms`);
    
    if (isbnTrouve) {
      // ISBN trouvé - chercher le livre correspondant dans l'inventaire
      const livre = inventaire.find(item => item.livre_id === isbnTrouve.livre_id);
      
      if (livre) {
        console.log(`🚀 ISBN trouvé ultra-rapide : ${livre.title} (${searchTime.toFixed(1)}ms)`);
      } else {
        console.log(`🚀 ISBN trouvé mais livre non en stock : ${isbnTrouve.isbn}`);
      }
    } else {
      // ISBN non trouvé
      console.log(`❌ ISBN non trouvé : ${cleanISBN}`);
    }
  }, [isbnList, inventaire]);

  const handleError = (errorMessage: string) => {
    console.error('Erreur de scan:', errorMessage);
  };

  // Fonction pour valider un code choisi


  // Fonction pour vérifier TOUS les codes scannés (méthode améliorée comme dans commande.tsx)
  const validateAllScannedCodes = () => {
    console.log('🔍 Vérification de TOUS les codes scannés...', scannedCodes);
    
    // Vérifier TOUS les ISBNs pour trouver le livre
    let livreFound = null;
    let isbnTrouve = null;
    
    // Première passe : chercher un ISBN valide
    for (const code of scannedCodes) {
      console.log(`🔍 Vérification de l'ISBN: ${code}`);
      
      // Vérifier si l'ISBN existe dans la liste des ISBN
      const isbnMatch = isbnList.find(item => item.isbn.toString() === code.trim());
      
      if (isbnMatch) {
        console.log(`✅ ISBN trouvé dans la base: ${isbnMatch.isbn}`);
        isbnTrouve = isbnMatch;
        break; // On a trouvé un ISBN valide, on peut arrêter
      }
    }
    
    // Si on a trouvé un ISBN, chercher le livre correspondant
    if (isbnTrouve) {
      console.log(`🔍 Recherche du livre pour l'ISBN: ${isbnTrouve.isbn}`);
      const livre = inventaire.find(item => item.livre_id === isbnTrouve.livre_id);
      
      if (livre) {
        console.log(`✅ Livre trouvé: ${livre.title}`);
        livreFound = livre;
      } else {
        console.log(`❌ ISBN trouvé mais livre non en stock: ${isbnTrouve.isbn}`);
      }
    } else {
      console.log(`❌ Aucun ISBN valide trouvé dans les codes scannés`);
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
      // ✅ ISBN trouvé : ouvrir la popup d'incrémentation
      setIsbn(livreFound.isbn.toString());
      setQuantiteToAdd(1);
      setTimeout(() => setIncrementModalOpened(true), 500);
    } else {
      // ❌ ISBN non trouvé : ouvrir le formulaire d'ajout avec ISBNs séparés
      setFormData(prev => ({ 
        ...prev, 
        isbn: scannedCodes[0] || '',
        additionalIsbns: scannedCodes.slice(1)
      }));
      setTimeout(() => setFormOpened(true), 500);
    }
  };



  /* Système de debounce pour éviter les scans répétés */
  const lastScanTime = useRef<number>(0);
  const lastScannedCode = useRef<string>('');

  // Fonction de diagnostic pour vérifier la compatibilité
  const checkCompatibility = useCallback(async () => {
    console.log('=== Diagnostic Scanner ===');
    console.log('User Agent:', navigator.userAgent);
    console.log('Est mobile:', isMobile);
    
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      console.log('Appareils vidéo disponibles:', videoDevices);
      
      if (videoDevices.length === 0) {
        console.warn('Aucun appareil vidéo détecté');
      }
    } catch (error) {
      console.error('Erreur lors de la détection des appareils:', error);
    }
  }, [isMobile]);

  // Fonction pour forcer l'accès à la caméra sur Android
  const forceCameraAccessAndroid = async () => {
    try {
      console.log('🔐 Tentative d\'accès forcé à la caméra sur Android...');
      
      // Détecter si c'est Android
      const isAndroid = /android/i.test(navigator.userAgent);
      if (!isAndroid) {
        console.log('📱 Pas Android, accès normal');
        return true;
      }
      
      // Sur Android, essayer d'accéder directement à la caméra
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 }
        }
      });
      
      console.log('✅ Accès caméra Android forcé réussi');
      
      // Arrêter immédiatement le stream pour libérer la caméra
      stream.getTracks().forEach(track => track.stop());
      
      return true;
    } catch (error) {
      console.warn('⚠️ Accès forcé Android échoué:', error);
      return false;
    }
  };

  // Initialisation scanner adaptatif (html5-qrcode OU QuaggaJS)
  useEffect(() => {
    if (scannerOpened && scannerReady && scannerRef.current) {
      console.log(`Scanner ${scannerType} prêt à être utilisé`);
      
      // Détecter Android pour utiliser une approche différente
      const isAndroid = /android/i.test(navigator.userAgent);
      
      if (isAndroid && scannerType === 'html5') {
        // APPROCHE SPÉCIALE POUR ANDROID - Contourner le bouton de permission
        console.log('🤖 Android détecté - Utilisation de l\'approche directe');
        
        // Créer un scanner personnalisé pour Android
        const initAndroidScanner = async () => {
          try {
            // Accéder directement à la caméra
            const stream = await navigator.mediaDevices.getUserMedia({
              video: {
                facingMode: 'environment',
                width: { ideal: 1280, max: 1920 },
                height: { ideal: 720, max: 1080 }
              }
            });
            
            // Créer un élément vidéo
            const video = document.createElement('video');
            video.srcObject = stream;
            video.style.width = '100%';
            video.style.height = '100%';
            video.style.objectFit = 'cover';
            video.autoplay = true;
            video.playsInline = true;
            
            // Ajouter au container
            const reader = document.getElementById('reader');
            if (reader) {
              reader.innerHTML = '';
              reader.appendChild(video);
            }
            
            // Utiliser l'API native de détection de codes-barres si disponible
            if ('BarcodeDetector' in window) {
              const BarcodeDetector = (window as unknown as { BarcodeDetector: BarcodeDetectorInterface }).BarcodeDetector;
              const barcodeDetector = new BarcodeDetector({
                formats: ['ean_13', 'ean_8', 'code_128']
              });
              
              const detectBarcodes = async () => {
                try {
                  const barcodes = await barcodeDetector.detect(video);
                  if (barcodes.length > 0) {
                    const code = barcodes[0].rawValue;
                    console.log('📱 Code détecté via BarcodeDetector:', code);
                    handleScan(code);
                  }
                } catch (error) {
                  console.log('Détection BarcodeDetector:', error);
                }
                requestAnimationFrame(detectBarcodes);
              };
              
              video.addEventListener('loadedmetadata', () => {
                detectBarcodes();
              });
            }
            
            setScanner(true);
            
            // Fonction de nettoyage pour Android
            const cleanup = () => {
              stream.getTracks().forEach(track => track.stop());
              if (reader) {
                reader.innerHTML = '';
              }
              setScanner(null);
            };
            
            // Retourner la fonction de nettoyage
            return cleanup;
            
          } catch (error) {
            console.error('Erreur scanner Android direct:', error);
            // Fallback vers html5-qrcode normal
            console.log('🔄 Fallback vers scanner normal...');
            // Utiliser html5-qrcode en fallback
            const html5QrcodeScanner = new Html5QrcodeScanner(
              "reader",
              { 
                fps: SCANNER_CONFIG.fps,
                aspectRatio: 2.5,
                qrbox: { width: 250, height: 250 },
                videoConstraints: {
                  facingMode: 'environment',
                  width: { ideal: 1280, max: 1920 },
                  height: { ideal: 720, max: 1080 }
                }
              },
              false
            );
            html5QrcodeScanner.render(handleScan, handleError);
            setScanner(html5QrcodeScanner);
          }
        };
        
        initAndroidScanner();
        
      } else {
        // APPROCHE NORMALE POUR AUTRES PLATEFORMES
        const initNormalScanner = () => {
          // Essayer d'abord l'accès forcé à la caméra sur Android
          forceCameraAccessAndroid().then(() => {
            if (scannerType === 'html5') {
          // ANDROID/DESKTOP : html5-qrcode ULTRA-RAPIDE avec accès forcé à la caméra
          const html5QrcodeScanner = new Html5QrcodeScanner(
            "reader",
            { 
              fps: SCANNER_CONFIG.fps, // 30 FPS pour scan ultra-rapide
              aspectRatio: 2.5,
              qrbox: { width: 250, height: 250 }, // Zone de scan plus petite = plus rapide
              videoConstraints: {
                facingMode: 'environment',
                width: { ideal: 1280, max: 1920 }, // Résolution optimisée
                height: { ideal: 720, max: 1080 }
              },
              experimentalFeatures: {
                useBarCodeDetectorIfSupported: true // API native plus rapide
              },
              // CONFIGURATION SPÉCIALE POUR ANDROID - ÉVITER LE BOUTON DE PERMISSION
              showTorchButtonIfSupported: false,
              showZoomSliderIfSupported: false,
              defaultZoomValueIfSupported: 1,
              rememberLastUsedCamera: true,
              //supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
              // Désactiver l'interface de permission (propriété non supportée, on la retire)
              // Forcer l'utilisation de la caméra sans demander
              useBarCodeDetectorIfSupported: true
            },
            false // verbose = false pour moins de logs
          );

          // Rendre le scanner avec gestion d'erreur personnalisée
          html5QrcodeScanner.render(
            handleScan, 
            (error) => {
              console.error('Erreur de scan HTML5:', error);
              // Ne pas afficher l'erreur à l'utilisateur, juste logger
              handleError(error);
            }
          );
          setScanner(html5QrcodeScanner);

          return () => {
            if (html5QrcodeScanner) {
              html5QrcodeScanner.clear();
            }
          };
        } else {
        // IOS : QuaggaJS ULTRA-RAPIDE avec accès forcé à la caméra
        console.log('🚀 Initialisation QuaggaJS ultra-rapide...');
        Quagga.init({
          inputStream: {
            name: "Live",
            type: "LiveStream",
            target: document.getElementById('reader') as HTMLElement,
            constraints: {
              width: { min: 640, ideal: 1280, max: 1920 }, // Résolution optimisée
              height: { min: 480, ideal: 720, max: 1080 },
              facingMode: "environment",
              frameRate: { ideal: SCANNER_CONFIG.fps, max: 60 } // FPS ultra-rapide
            },
            area: { // Zone de scan réduite pour plus de vitesse
              top: "20%",
              right: "20%", 
              left: "20%",
              bottom: "20%"
            }
          },
          decoder: {
            readers: [
              "ean_reader", // ISBN-13 et EAN-13
              "ean_8_reader", // EAN-8
              "code_128_reader" // Codes-barres 128
            ] // Supprimé code_39 et codabar pour se concentrer sur les ISBN
          },
          locate: true, // Activé pour une détection plus précise
          locator: {
            patchSize: "small", // Taille réduite pour plus de vitesse
            halfSample: false // Désactivé pour une meilleure qualité
          },
          numOfWorkers: SCANNER_CONFIG.workers, // 4 workers pour traitement parallèle
          frequency: SCANNER_CONFIG.frequency, // 30 FPS
          debug: false
        }, (err: Error | null) => {
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
          const confidence = result.codeResult.format;
          
          // Filtrage par confiance pour éviter les faux positifs
          console.log('🚀 Code détecté par Quagga ultra-rapide:', code, 'Format:', confidence);
          
          if (code && code.length >= 10) { // Pré-filtre rapide pour ISBN
            handleScan(code);
          } else {
            console.log('⚡ Code ignoré (trop court):', code);
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
      });
        };
        
        initNormalScanner();
      }
    }
  }, [scannerOpened, scannerReady, scannerType, handleScan]);
  // Nettoyage quand le scanner se ferme
  useEffect(() => {
    if (!scannerOpened && scanner) {
      console.log('Scanner fermé, nettoyage des ressources...');
      
      try {
        if (scannerType === 'html5') {
          // Vérifier que scanner est bien une instance de Html5QrcodeScanner
          if (scanner && typeof scanner === 'object' && 'clear' in scanner) {
            (scanner as Html5QrcodeScanner).clear();
            console.log('✅ Scanner HTML5 nettoyé');
          } else if (scanner === true) {
            // Scanner Android direct - nettoyer le DOM
            const reader = document.getElementById('reader');
            if (reader) {
              reader.innerHTML = '';
            }
            console.log('✅ Scanner Android nettoyé');
          }
        } else {
          // Scanner QuaggaJS
          Quagga.stop();
          console.log('✅ Scanner QuaggaJS nettoyé');
        }
      } catch (error) {
        console.error('Erreur lors du nettoyage du scanner:', error);
      }
      
      setScanner(null);
    }
  }, [scannerOpened, scanner, scannerType]);

  // Diagnostic quand le scanner s'ouvre
  useEffect(() => {
    if (scannerOpened) {
      console.log('🎯 Scanner ouvert - diagnostic en cours...');
      checkCompatibility();
    }
  }, [scannerOpened, checkCompatibility]);

  // Récupération de l'inventaire et de la liste des ISBNs au chargement
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        // Récupérer l'inventaire
        const inventaireResponse = await fetch('/api/inventaire', { method: 'GET' });
        const inventaireResult = await inventaireResponse.json();
        setInventaire(inventaireResult.data || []);
        
        // Récupérer la liste des ISBNs
        const isbnResponse = await fetch('/api/isbn', { method: 'GET' });
        const isbnResult = await isbnResponse.json();
        setIsbnList(isbnResult.data || []);
      } catch (error) {
        console.error('Erreur lors de la récupération des données:', error);
        setInventaire([]);
        setIsbnList([]);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
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
          image: capturedImage,
          date_de_production: formData.date_de_production
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
          isbn: String(formData.isbn),
          date_de_production: formData.date_de_production
        }),
      });

      // 2.5. Ajouter les ISBNs additionnels s'il y en a
      if (formData.additionalIsbns && formData.additionalIsbns.length > 0) {
        console.log('📚 Ajout des ISBNs additionnels:', formData.additionalIsbns);
        
        for (const additionalIsbn of formData.additionalIsbns) {
          try {
            await fetch('/api/isbn', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                isbn: additionalIsbn.trim(),
                livre_id: livreId
              }),
            });
            console.log(`✅ ISBN additionnel ajouté: ${additionalIsbn}`);
          } catch (error) {
            console.error(`❌ Erreur lors de l'ajout de l'ISBN ${additionalIsbn}:`, error);
          }
        }
      }

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
          livre_title: formData.title,
          date_de_production: formData.date_de_production
        }),
      });

             alert("Livre, inventaire et réception ajoutés avec succès !");
       setFormOpened(false);
       setFormData({  
         title: '', author: '', price: '', quantite: '', isbn: '', 
         description: '', image: '', livre_id: '', livre_title: '', 
         name_user: '', info: '', user_id: '', date_reception: '',
         date_de_production: '', additionalIsbns: [] 
       });
       setResult('');
       setCapturedImage('');

       // Rafraîchir l'inventaire après ajout
       setLoading(true);
       const response = await fetch('/api/inventaire', { method: 'GET' });
       const result = await response.json();
       setInventaire(result.data || []);
       setLoading(false);

       // Rediriger vers la page commande après ajout réussi
       setTimeout(() => {
         window.location.href = '/commande';
       }, 1000); // Délai de 1 seconde pour laisser le temps de voir le message de succès

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
    
    // Vérifier si la quantité à ajouter est supérieure au stock disponible

    
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
      alert(`✅ Quantité du livre "${livre.title}" incrémentée de ${ajout} !`);
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

  const [capturedImage, setCapturedImage] = useState('');

  const handleTakePhoto = () => {
    // Créer un input file caché pour accéder à l'appareil photo
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment'; // Force la caméra arrière sur mobile
    
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const dataUrl = event.target?.result as string;
          setCapturedImage(dataUrl);
          setFormData(prev => ({ ...prev, image: dataUrl }));
        };
        reader.readAsDataURL(file);
      }
    };
    
    // Déclencher le clic sur l'input
    input.click();
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



  return (
    <div className={styles.StyleCommandeGenerale}>
      {/* Icônes flottantes décoratives */}
      <div className={styles.floatingBooks}>
        {/* Livres flottants */}
        <div className={styles.floatingBook} style={{ top: '10%', left: '15%', animationDelay: '0s' }}>
              <img src="/2940179870227_p0_v1_s600x595.jpg" alt="Livre du frère Zach" style={{ width: '60px', height: '60px', borderRadius: '50%', objectFit: 'cover', boxShadow: '0 4px 8px rgba(0,0,0,0.3)' }} />
            </div>
            <div className={styles.floatingBook} style={{ top: '20%', right: '20%', animationDelay: '1s' }}>
              <img src="/41--eGipgSL.webp" alt="Livre du frère Zach" style={{ width: '60px', height: '60px', borderRadius: '50%', objectFit: 'cover', boxShadow: '0 4px 8px rgba(0,0,0,0.3)' }} />
            </div>
            <div className={styles.floatingBook} style={{ top: '35%', left: '10%', animationDelay: '2s' }}>
              <img src="/images.jpeg" alt="Livre du frère Zach" style={{ width: '60px', height: '60px', borderRadius: '50%', objectFit: 'cover', boxShadow: '0 4px 50% rgba(0,0,0,0.3)' }} />
            </div>
            <div className={styles.floatingBook} style={{ top: '45%', right: '15%', animationDelay: '3s' }}>
              <img src="/2940179870227_p0_v1_s600x595.jpg" alt="Livre du frère Zach" style={{ width: '60px', height: '60px', borderRadius: '50%', objectFit: 'cover', boxShadow: '0 4px 50% rgba(0,0,0,0.3)' }} />
            </div>
            <div className={styles.floatingBook} style={{ top: '15%', left: '50%', animationDelay: '1.5s' }}>
              <img src="/41--eGipgSL.webp" alt="Livre du frère Zach" style={{ width: '60px', height: '60px', borderRadius: '50%', objectFit: 'cover', boxShadow: '0 4px 50% rgba(0,0,0,0.3)' }} />
            </div>
            <div className={styles.floatingBook} style={{ top: '30%', right: '45%', animationDelay: '2.5s' }}>
              <img src="/images.jpeg" alt="Livre du frère Zach" style={{ width: '60px', height: '60px', borderRadius: '50%', objectFit: 'cover', boxShadow: '0 4px 50% rgba(0,0,0,0.3)' }} />
            </div>
            <div className={styles.floatingBook} style={{ top: '50%', left: '25%', animationDelay: '0.5s' }}>
              <img src="/2940179870227_p0_v1_s600x595.jpg" alt="Livre du frère Zach" style={{ width: '60px', height: '60px', borderRadius: '50%', objectFit: 'cover', boxShadow: '0 4px 50% rgba(0,0,0,0.3)' }} />
            </div>
            <div className={styles.floatingBook} style={{ top: '40%', right: '35%', animationDelay: '3.5s' }}>
              <img src="/28635380.jpg" alt="Livre du frère Zach" style={{ width: '60px', height: '60px', borderRadius: '50%', objectFit: 'cover', boxShadow: '0 4px 50% rgba(0,0,0,0.3)' }} />
            </div>
        
        {/* Machines de production flottantes */}
        <div className={styles.floatingDollar} style={{ top: '25%', left: '35%', animationDelay: '0.8s' }}>⚙️</div>
        <div className={styles.floatingDollar} style={{ top: '55%', right: '25%', animationDelay: '2.2s' }}>🏭</div>
        <div className={styles.floatingDollar} style={{ top: '12%', right: '40%', animationDelay: '1.8s' }}>🔧</div>
        <div className={styles.floatingDollar} style={{ top: '48%', left: '45%', animationDelay: '3.2s' }}>⚡</div>
        <div className={styles.floatingDollar} style={{ top: '8%', left: '65%', animationDelay: '0.3s' }}>🔩</div>
        <div className={styles.floatingDollar} style={{ top: '38%', right: '60%', animationDelay: '2.8s' }}>🏗️</div>
        <div className={styles.floatingDollar} style={{ top: '22%', left: '75%', animationDelay: '1.2s' }}>⚒️</div>
      </div>

      {/* Section montant principal */}
      <div className={styles.revolutAmount}>
        <div className={styles.revolutQuickActions}>
          <div className={styles.quickAction}>
          <div className={styles.mainIcon} onClick={() => setScannerOpened(true)}>
            <IconCamera size={80} color="white" />
          </div>
          </div>
          <Center> 
            <div className={styles.productCard} style={{ position: 'fixed', bottom: '0', left: '0', right: '0', top: '370px' }}>
              <div className={styles.productHeader}>
                <div className={styles.productTitle}>Réception de livres </div>
                <div className={styles.productHeart}> </div>
              </div>
              <div className={styles.productDescription}>
                Réception de livres , rajouté vos livres directement dans l&apos;inventaire
              </div>
              <Center style={{display: 'flex', flexDirection: 'row', gap: '30px'}}>
                <div onClick={() => setFormOpened(true)} className={styles.featureIcon}>
                  <span>➕</span>
                  <div className={styles.featureIconLabel}>Ajouter</div>
                </div>
                <div onClick={() => setInventaireModalOpened(true)} className={styles.featureIcon}>
                  <span>📚</span>
                  <div className={styles.featureIconLabel}>Inventaire</div>
                </div>
              </Center>
            </div>
          </Center>
        </div>
      </div>

      <Modal opened={inventaireModalOpened} onClose={() => setInventaireModalOpened(false)}> 
        <div style={{ padding: '20px' }}>
          <h3 style={{ marginBottom: '20px', textAlign: 'center' }}>📚 Livres en Stock</h3>
          
          <div style={{ padding: '0 0 20px 0' }}>
            <TextInput
              placeholder="Rechercher un livre..."
              value={search}
              onChange={(e) => setSearch(e.currentTarget.value)}
              className={styles.searchInput}
            />
          </div>
          
          <div className={styles.transactionsList}>
            {loading ? (
              <Center>
                <Loader />
              </Center>
            ) : filteredInventaire.length === 0 ? (
              <Center>
                <Text c="dimmed">Aucun livre trouvé</Text>
              </Center>
            ) : (
              filteredInventaire.map((item) => (
                <div 
                  key={item.id} 
                  className={styles.transaction}
                  style={{ cursor: 'pointer' }}
                  onClick={async () => {
                    setSelectedBook(item);
                    setNewIsbn(''); // Réinitialiser le champ d'ajout
                    setInventaireModalOpened(false);
                    setBookDetailsModalOpened(true);
                    // Réinitialiser l'état d'édition
                    setIsEditingQuantity(false);
                    setTempQuantity(0);
                    // Charger les ISBN existants depuis la base de données
                    await loadExistingIsbns(item.livre_id);
                  }}
                >
                  <div className={styles.transactionIcon}>
                    {item.livre?.image ? 
                      <img src={item.livre.image} alt="image" style={{width: '50px', height: '50px'}} /> 
                      : '📚'
                    }
                  </div>
                  <div className={styles.transactionInfo}>
                    <div className={styles.transactionTitle}>{item.title}</div>
                    <div className={styles.transactionTime}>
                      👤 {item.author} | 📖 ISBN: {item.isbn}
                    </div>
                  </div>
                  <div className={styles.transactionAmount}>
                    <div style={{ fontSize: '20px', fontWeight: 'bold' }}>
                      {item.quantite}x
                    </div>
                    <div style={{ fontSize: '14px', color: '#666' }}>
                      {item.price}€
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </Modal>
      {/* Scanner en DIV plein écran - AUCUNE compression */}
      {scannerOpened && (
          <div className={scannerStyles.scannerFullScreen}>
            {/* Header avec bouton fermer */}
            <div className={scannerStyles.scannerHeader}>
              <Text className={scannerStyles.scannerTitle}>
                📱 Scanner ISBN
              </Text>
              <Button onClick={() => setScannerOpened(false)}  variant="filled"   color="red"size="sm" style={{marginTop: '100px',}} >
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
                      ✅ Valdier
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
              <div className={scannerStyles.controlsContainer}>
                <TextInput
                  placeholder="ISBN 10 ou 13 chiffres"
                  value={isbn}
                  onChange={(e) => {
                    const value = e.currentTarget.value;
                    // Permettre seulement les chiffres, tirets et X
                    const cleanValue = value.replace(/[^0-9\-X]/g, '');
                    setIsbn(cleanValue);
                  }}
                  className={scannerStyles.isbnInput}
                  styles={{
                    input: { 
                      backgroundColor: 'white', 
                      color: 'black',
                      fontSize: '16px', // Empêche le zoom sur iOS
                      transform: 'scale(1)', // Force la taille
                      minHeight: '44px' // Taille minimale recommandée pour iOS
                    }
                  }}
                  error={isbn && !isValidISBN(isbn) ? "Format ISBN invalide" : null}
                />
                <Button 
                  onClick={() => {
                    if (isbn.trim()) {
                      // Valider le format ISBN avant de tester
                      if (!isValidISBN(isbn)) {
                        alert("❌ Format ISBN invalide !\n\n📚 Un ISBN doit contenir :\n• 10 chiffres (avec éventuel X à la fin)\n• 13 chiffres\n• Peut contenir des tirets");
                        return;
                      }
                      
                      // Nettoyer l'ISBN pour la recherche
                      const cleanISBN = isbn.replace(/[\s-]/g, '');
                      
                      // Vérifier si l'ISBN existe dans la liste des ISBN
                      const isbnTrouve = isbnList.find(item => item.isbn.toString() === cleanISBN);
                      
                      if (isbnTrouve) {
                        // ISBN trouvé - chercher le livre correspondant dans l'inventaire
                        const livre = inventaire.find(item => item.livre_id === isbnTrouve.livre_id);
                        
                        if (livre) {
                          alert(`✅ ISBN trouvé : ${livre.title} (ISBN: ${isbnTrouve.isbn}, Livre ID: ${isbnTrouve.livre_id})`);
                          setIsbn(livre.isbn.toString());
                          setQuantiteToAdd(1);
                          setScannerOpened(false);
                          setTimeout(() => setIncrementModalOpened(true), 500);
                        } else {
                          alert(`✅ ISBN trouvé mais livre non en stock : ${isbnTrouve.isbn} (Livre ID: ${isbnTrouve.livre_id})`);
                        }
                      } else {
                        // ISBN non trouvé : ouvrir le formulaire d'ajout
                        setFormData(prev => ({ 
                          ...prev, 
                          isbn: cleanISBN,
                          additionalIsbns: [] // Pas d'ISBNs additionnels pour une saisie manuelle
                        }));
                        setScannerOpened(false);
                        setTimeout(() => setFormOpened(true), 500);
                      }
                    } else {
                      alert("Veuillez saisir un ISBN");
                    }
                  }}
                  disabled={!isbn || !isValidISBN(isbn)}
                  color="green"
                  size="md"
                >
                  ✓ Valider
                </Button>
              </div>
              
            </div>
          </div>
      )}

      {/* Formulaire d'ajout */}
      <Modal style={{height: '400px', zIndex: 1000}}
        opened={formOpened} 
        onClose={() => {
          setFormOpened(false);
          // Si on vient de la page commande, retourner automatiquement
          const returnToCommande = localStorage.getItem('returnToCommande');
          if (returnToCommande === 'true') {
            localStorage.removeItem('returnToCommande');
            localStorage.removeItem('autoOpenForm');
            localStorage.removeItem('scannedIsbns');
            localStorage.removeItem('IsbnScanner');
            window.location.href = '/commande';
          }
        }} 
        title="Ajouter  un livre" 
        centered 
        size={isMobile ? "xs" : "xl"}
      >
        <form onSubmit={handleFormSubmit} style={{ 
          width: isMobile ? '100%' : '600px', 
          height: '450px',
          margin: '0 auto' 
        }} className={isMobile ? styles.iosModalContent : ''}>
          {/* ISBN principal */}
          <TextInput 
            label="ISBN principal" 
            name="isbn"
            value={formData.isbn} 
            onChange={handleFormChange} 
            required 
            mb="sm"
            classNames={isMobile ? { input: styles.iosModalInput } : undefined} 
            style={{fontSize: '10px', width: '100%'}}
            placeholder="ISBN principal du livre"
          />
          
          {/* ISBNs additionnels scannés */}
          {formData.additionalIsbns && formData.additionalIsbns.length > 0 && (
            <div style={{ marginBottom: '15px' }}>
              <Text size="sm" color="dimmed" mb="xs">
                📚 ISBNs additionnels détectés ({formData.additionalIsbns.length}) :
              </Text>
              {formData.additionalIsbns.map((isbn, index) => (
                <div key={index} style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '10px', 
                  marginBottom: '8px',
                  padding: '10px',
                  backgroundColor: '#f8f9fa',
                  borderRadius: '6px',
                  border: '1px solid #e9ecef'
                }}>
                  <Text size="sm" style={{ flex: 1, fontFamily: 'monospace' }}>{isbn}</Text>
                  <Button 
                    size="xs" 
                    color="red" 
                    variant="outline"
                    onClick={() => {
                      const newAdditionalIsbns = formData.additionalIsbns.filter((_, i) => i !== index);
                      setFormData(prev => ({ ...prev, additionalIsbns: newAdditionalIsbns }));
                    }}
                    title="Supprimer cet ISBN"
                  >
                    ✖
                  </Button>
                </div>
              ))}
            </div>
          )}

          <TextInput 
            label="Titre du livre" 
            name="title" 
            value={formData.title} 
            onChange={handleFormChange} 
            required 
            mb="sm" 
            classNames={isMobile ? { input: styles.iosModalInput } : undefined}
            style={{fontSize: '10px',}}
          />

          <TextInput 
            label="Auteur" 
            name="author" 
            value={formData.author} 
            onChange={handleFormChange} 
            required 
            mb="sm" 
            classNames={isMobile ? { input: styles.iosModalInput } : undefined}
            style={{fontSize: '10px',}}
          />

          <Textarea 
            label="Description" 
            name="description" 
            value={formData.description} 
            onChange={handleFormChange} 
            minRows={1} 
            mb="sm" 
            classNames={isMobile ? { input: styles.iosModalInput } : undefined}
            style={{fontSize: '10px',}}
          />


          <TextInput 
            label="Quantité" 
            name="quantite" 
            value={formData.quantite} 
            onChange={handleFormChange} 
            required 
            mb="sm"
            classNames={isMobile ? { input: styles.iosModalInput } : undefined}
            style={{fontSize: '10px',}}
          />
          <TextInput 
            label="Prix" 
            name="price" 
            value={formData.price} 
            onChange={handleFormChange} 
            required 
            mb="sm"
            classNames={isMobile ? { input: styles.iosModalInput } : undefined}
            style={{fontSize: '10px',}}
          />
          <TextInput 
            label="Date de production (Mois/Année)" 
            name="date_de_production" 
            type="month"
            value={formData.date_de_production} 
            onChange={handleFormChange} 
            required 
            mb="sm"
            classNames={isMobile ? { input: styles.iosModalInput } : undefined}
            style={{fontSize: '10px',}}
          />
          <center>
            <Button  mt="sm"  onClick={e => { e.preventDefault(); handleTakePhoto(); }}   className={isMobile ? styles.iosModalButton : ''} style={{fontSize: '10px',}}  >
              📸 Prendre photo
            </Button>
            <Button  mt="sm"   type="submit"   className={isMobile ? styles.iosModalButton : ''} style={{fontSize: '10px', marginLeft: '10px'}} >
             Ajouter le livre
            </Button>
            </center>
          {capturedImage && (
            <div style={{ marginTop: 10 }}>
              <Text size="sm" color="dimmed" mb="xs">Aperçu de la photo :</Text>
              <img src={capturedImage} alt="Aperçu" style={{ width: 150, borderRadius: 8 }} />
            </div>
          )}
          <Center h={100}>
          </Center>
        </form>
      </Modal>

      {/* Modal détails des livres sélectionnés */}
      <Modal opened={detailsOpened} onClose={() => setDetailsOpened(false)} title="ajouté un livre sélectionné" size="xl" centered>
        {editedBooks.length === 0 ? (
          <Text>Aucun livre sélectionné.</Text>
        ) : (
          editedBooks.map(book => (
            <Paper key={book.id} shadow="xs" p="md" mb="md" withBorder>
              <TextInput label="Titre" value={book.title} readOnly mb="md" />
              <TextInput 
                label="ISBN" 
                value={book.isbn.toString()} 
                onChange={e => handleIsbnChange(book.id, e.target.value)} 
                mb="md"
              />
              <TextInput label="Quantité" value={book.quantite} readOnly mb="md" />
              <TextInput label="Quantité à ajouter" type="number" value={ajouts[book.id] ?? ''} onChange={e => handleAjoutChange(book.id, e.target.value)} mb="md" min={1} />
              <center>  
                <Button mt="md" onClick={() => incrementInventaire(book, ajouts[book.id] || 0)}>
                  valide
                </Button>
              </center>
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
                  onClick={() => validateAllScannedCodes()}
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

      {/* Modal d'incrémentation (comme dans commande.tsx) */}
      <Modal 
        opened={incrementModalOpened} 
        onClose={() => { setIncrementModalOpened(false); setQuantiteToAdd(1); }} 
        title="Ajouté à l'inventaire" 
        centered 
        size={isMobile ? "xs" : "md"}
      >
        {(() => {
          const livre = inventaire.find(item => item.isbn.toString() === isbn.trim());
          if (livre) {
            return (
              <div style={{ width: 400, maxWidth: '80vw', margin: '0 auto' }}>
                <Text color="green" ta="center" size="lg" mb="xl">
                  📚 Livre trouvé - Ajouté à  l&apos;inventaire
                </Text>
                
                <TextInput 
                  label="ISBN" 
                  value={livre.isbn} 
                  readOnly 
                  mb="sm"
                />
                
                <TextInput 
                  label="Titre du livre" 
                  value={livre.title} 
                  readOnly 
                  mb="sm"
                />
                
                <TextInput 
                  label="Auteur" 
                  value={livre.author} 
                  readOnly 
                  mb="sm"
                />
                
                <TextInput 
                  label="Prix" 
                  value={livre.price} 
                  readOnly 
                  mb="sm"
                />
                
                <TextInput 
                  label="Quantité actuelle" 
                  value={livre.quantite} 
                  readOnly 
                  mb="md"
                />
                
                <TextInput 
                  label="Quantité à ajouter" 
                  type="number"
                  min={1}
                  value={quantiteToAdd}
                  onChange={(e) => setQuantiteToAdd(Number(e.target.value))}
                  placeholder="Nombre d'exemplaires à ajouter"
                  mb="md"
                />
                
                <Button
                  color="green"
                  fullWidth
                  onClick={async () => {
                    if (quantiteToAdd <= 0) {
                      alert('Veuillez saisir une quantité supérieure à 0');
                      return;
                    }    
                    try {
                      await incrementInventaire(livre, quantiteToAdd);
                      setIncrementModalOpened(false);
                    } catch (error) {
                      console.error('Erreur lors de l&apos;incrémentation:', error);
                      alert('Erreur lors de l&apos;incrémentation');
                    }
                  }}
                >
                  ✅ Ajouté à l&apos;inventaire
                </Button>
              </div>
            );
          }
          return (
            <Text color="red" ta="center">
              ❌ Livre non trouvé
            </Text>
          );
        })()}
      </Modal>

      {/* Modal de détails du livre (nouvelle fonctionnalité) */}
      <Modal 
        opened={bookDetailsModalOpened} 
        onClose={() => { 
          setBookDetailsModalOpened(false); 
          setSelectedBook(null); 
          setBookAdditionalIsbns([]); // Réinitialiser les ISBN additionnels
          setNewIsbn(''); // Réinitialiser le champ d'ajout
        }} 
        title="Détails du livre" 
        centered 
        size={isMobile ? "xs" : "md"}
      >
        {selectedBook && (
          <div style={{ width: 400, maxWidth: '80vw', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              {selectedBook.livre?.image ? (
                <img 
                  src={selectedBook.livre.image} 
                  alt="Couverture du livre" 
                  style={{ 
                    width: '120px', 
                    height: '160px', 
                    objectFit: 'cover',
                    borderRadius: '8px',
                    boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
                  }} 
                />
              ) : (
                <div style={{ 
                  width: '120px', 
                  height: '160px', 
                  backgroundColor: '#f0f0f0',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '48px',
                  margin: '0 auto'
                }}>
                  📚
                </div>
              )}
            </div>
            
            <TextInput 
              label="ISBN principal" 
              value={selectedBook.isbn} 
              readOnly 
              mb="sm"
            />
            
            <TextInput 
              label="Titre du livre" 
              value={selectedBook.title} 
              readOnly 
              mb="sm"
            />
            
            <TextInput 
              label="Auteur" 
              value={selectedBook.author} 
              readOnly 
              mb="sm"
            />
            
            <TextInput 
              label="Prix" 
              value={`${selectedBook.price}€`} 
              readOnly 
              mb="sm"
            />
            
            <TextInput 
              label="Quantité en stock" 
              value={isEditingQuantity ? tempQuantity : selectedBook.quantite} 
              readOnly={!isEditingQuantity}
              onChange={(e) => isEditingQuantity && setTempQuantity(parseInt(e.target.value) || 0)}
              mb="md"
              rightSection={
                isEditingQuantity ? (
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <Button 
                      size="xs" 
                      variant="filled" 
                      color="green"
                      onClick={handleSaveQuantity}
                    >
                      ✓
                    </Button>
                    <Button 
                      size="xs" 
                      variant="filled" 
                      color="red"
                      onClick={handleCancelEdit}
                    >
                      ✕
                    </Button>
                  </div>
                ) : (
                  <Button 
                    size="xs" 
                    variant="light" 
                    onClick={handleEditQuantity}
                    leftSection={<IconEdit size={14} />}
                  >
                    Modifier
                  </Button>
                )
              }
            />
            
            {/* Section pour l'ajout d'ISBN */}
            <div style={{ 
              border: '1px solid #e9ecef', 
              borderRadius: '8px', 
              padding: '15px', 
              marginBottom: '15px',
              backgroundColor: '#f8f9fa'
            }}>
              <Text size="sm" fw={500} mb="sm" color="blue">
                📚 Gestion des ISBN
              </Text>
              
              {/* Affichage de tous les ISBN pour ce livre */}
              {bookAdditionalIsbns.length > 0 && (
                <div style={{ marginBottom: '10px' }}>
                  <Text size="xs" color="dimmed" mb="xs">
                    📚 Tous les ISBN de ce livre ({bookAdditionalIsbns.length}) :
                  </Text>
                  {bookAdditionalIsbns.map((isbn, index) => (
                    <div key={index} style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '8px', 
                      marginBottom: '5px',
                      padding: '5px 8px',
                      backgroundColor: 'white',
                      borderRadius: '4px',
                      border: '1px solid #dee2e6'
                    }}>
                      <Text size="sm" style={{ flex: 1 }}>{isbn}</Text>
                      <Text size="xs" color="green">✓</Text>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Formulaire d'ajout d'ISBN */}
              <div style={{ display: 'flex', gap: '8px', alignItems: 'end' }}>
                <TextInput 
                  label="Nouvel ISBN"
                  placeholder="Saisir un nouvel ISBN"
                  value={newIsbn}
                  onChange={(e) => setNewIsbn(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      addIsbnToBook();
                    }
                  }}
                  style={{ flex: 1 }}
                  size="sm"
                />
                <Button
                  color="green"
                  size="sm"
                  loading={isAddingIsbn}
                  onClick={addIsbnToBook}
                  disabled={!newIsbn.trim()}
                >
                  ➕
                </Button>
              </div>
            </div>
            
            <Button
              color="blue"
              fullWidth
              onClick={() => {
                setBookDetailsModalOpened(false);
                setSelectedBook(null);
                setBookAdditionalIsbns([]); // Réinitialiser les ISBN additionnels
                setNewIsbn(''); // Réinitialiser le champ d'ajout
                // Ouvrir la modale d'incrémentation avec ce livre
                setIsbn(selectedBook.isbn.toString());
                setQuantiteToAdd(1);
                setIncrementModalOpened(true);
              }}
            >
              ➕ Ajouter au stock
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
}

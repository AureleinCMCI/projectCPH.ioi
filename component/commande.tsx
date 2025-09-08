'use client';

import Quagga, { QuaggaJSResultCallbackFunction, QuaggaJSResultObject } from '@ericblade/quagga2';
import { Button, Center, Modal, NumberInput, Radio, Table, Text, TextInput } from '@mantine/core';
import { IconCamera } from '@tabler/icons-react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { jwtDecode } from 'jwt-decode';
import { useCallback, useEffect, useRef, useState } from 'react';

import styles from './style/ScannerResception.module.css';

import stylesCommande from './style/commande.module.css';

// Interface pour BarcodeDetector
interface BarcodeDetectorInterface {
  new (options: { formats: string[] }): {
    detect(video: HTMLVideoElement): Promise<Array<{ rawValue: string }>>
  };
}


  type InventaireItem = {
    id: number;
    livre_id: number;
    title: string;
    author: string;
    quantite: number;
    price: number;
    isbn: number;
    quantite_reservee?: number;
    date_expiration_reservation?: string;
    livre?: { image?: string };
  };

  /*Récupération des informations de l'utilisateur , verifié qui est connecté via jeto*/
  let user: { id: string; name: string; avatar?: string } | null = null;
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('jwt');
    if (token) {
      try {
        user = jwtDecode<{ id: string; name: string; avatar?: string }>(token);
      } catch {}
    }
  }

  // Composant affichant les commandes

  function formatDateTimeParis(dateString: string) {
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
      timeZone: 'Europe/Paris'
    };
    // Format: 16/07/2025, 14:08:56
    const parts = new Intl.DateTimeFormat('fr-FR', options).formatToParts(date);
    const get = (type: string) => parts.find(p => p.type === type)?.value || '';
    return `${get('day')}_${get('month')}_${get('year')} ${get('hour')}.${get('minute')}.${get('second')}`;
  }

  export default function Commande() {
    useEffect(() => {
      const token = localStorage.getItem('jwt');
      if (!token) {
        window.location.href = '/';
        return;
      }
      try {
        jwtDecode<{ id: string; name: string }>(token);
      } catch {
        window.location.href = '/';
      }
    }, []);

    const [scannerOpened, setScannerOpened] = useState(false);
    const [scannerReady, setScannerReady] = useState(false);
    const scannerRef = useRef<HTMLDivElement | null>(null);
    const [search, setSearch] = useState('');
    const [formOpened, setFormOpened] = useState(false);
    const [isbn, setIsbn] = useState('');
    const [inventaire, setInventaire] = useState<InventaireItem[]>([]);
    const [supprimer, setSupprimer] = useState<number>(1);
    const [commandeOpened, setCommandeOpened] = useState(false);
    const [commandes, setCommandes] = useState<{ user_id: number; date_achat: string; title: string;quantite: number; price?: number; vendeur?: string; user?: { name?: string };
    }[]>([]);
    const [isMobile, setIsMobile] = useState(false); // Détection mobile
    const [scanner, setScanner] = useState<Html5QrcodeScanner | boolean | null>(null);
    const [scannerType, setScannerType] = useState<'html5' | 'quagga'>('html5');
    const [androidCleanup, setAndroidCleanup] = useState<(() => void) | null>(null);
    const [showCodesList, setShowCodesList] = useState(false);
    const [scannedCodes, setScannedCodes] = useState<string[]>([]);
    const [isbnList, setIsbnList] = useState<{ isbn: number; livre_id: number }[]>([]);

    // État pour la modale de détails du livre
    const [detailOpened, setDetailOpened] = useState(false);
    const [selectedLivre, setSelectedLivre] = useState<InventaireItem | null>(null);

    // État pour la modale de liste des commandes
    const [listeCommandeOpened, setListeCommandeOpened] = useState(false);
    
    // État pour la modale de vente
    const [venteOpened, setVenteOpened] = useState(false);
    
    // États pour la modale de réduction
    const [reductionOpened, setReductionOpened] = useState(false);
    const [livreEnVente, setLivreEnVente] = useState<InventaireItem | null>(null);
    const [quantiteVente, setQuantiteVente] = useState(1);
    const [typeReduction, setTypeReduction] = useState<'euros' | 'pourcentage'>('euros');
    const [valeurReduction, setValeurReduction] = useState(0);
    const [modeModal, setModeModal] = useState<'vente' | 'reservation'>('vente');
    const [dateReservation, setDateReservation] = useState('');

    // État pour la modale des réservations
    const [reservationsOpened, setReservationsOpened] = useState(false);
    const [reservations, setReservations] = useState<{
      id: number;
      inventaire_id: number;
      quantite_bloquee: number;
      date_expiration: string;
      date_creation: string;
      name?: string;
      telephone?: string;
      user_id?: number;
      inventaire?: {
        title: string;
        author: string;
        price: number;
        isbn: number;
      };
      "USER"?: {
        id: number;
        name: string;
        admin: boolean;
      };
    }[]>([]);

    
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

    // Fonction de diagnostic pour vérifier la compatibilité
    const checkCompatibility = async () => {
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
    };

    /* Téléchargement du fichier CSV */
    const downloadCSV = () => {
      console.log('📥 Bouton CSV cliqué !');
      console.log('Commandes disponibles:', commandes);
      
      const header = ["Date", "Utilisateur", "Titre", "Quantité"];
      const rows = commandes.map(cmd => [
        cmd.date_achat,
        cmd.vendeur,
        cmd.title,
        cmd.quantite
      ]);
      const csvContent = [header, ...rows].map(e => e.join(",")).join("\n");

      const blob = new Blob([csvContent], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "commandes.csv";
      link.click();
      setTimeout(() => window.URL.revokeObjectURL(url), 100);
      console.log('✅ Téléchargement CSV terminé');
    };

    if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
      navigator.mediaDevices.enumerateDevices()
      .then((devices) => {
        devices.forEach((device) => {
          console.log(`Appareil Id: ${device.deviceId}, Type: ${device.kind}, Label: ${device.label}`);
        });
      })
      .catch((error) => {
        console.error('Erreur lors de la récupération des appareils médias :', error);
      });
    } else {
      console.warn("navigator.mediaDevices ou enumerateDevices non disponible");
    }
  /* recupére les commandes */
    useEffect(() => {
      const fetchCommandes = async () => {
        const response = await fetch('/api/commande', { method: 'GET' });
        const result = await response.json();
        setCommandes(result.data || []);
      };
      fetchCommandes();
    }, []);

    /* récupérer les réservations de l'utilisateur connecté */
    const fetchReservations = async () => {
      if (!user) return;
      
      try {
        const response = await fetch(`/api/reservations?user_id=${user.id}`, { method: 'GET' });
        const result = await response.json();
        setReservations(result.data || []);
      } catch (error) {
        console.error('Erreur lors de la récupération des réservations:', error);
        setReservations([]);
      }
    };

    // Charger les réservations au démarrage
    useEffect(() => {
      if (user) {
        fetchReservations();
      }
    }, [user]);

    /* annuler une réservation */
    const annulerReservation = async (reservationId: number) => {
      if (!user) return;
      
      if (!confirm('❓ Êtes-vous sûr de vouloir annuler cette réservation ?')) {
        return;
      }

      try {
        const res = await fetch('/api/reservations', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: reservationId,
            user_id: user.id
          }),
        });

        if (res.ok) {
          alert('✅ Réservation annulée avec succès !');
          fetchReservations(); // Rafraîchir la liste
          // Rafraîchir l'inventaire aussi
          const response = await fetch('/api/inventaire', { method: 'GET' });
          const result = await response.json();
          setInventaire(result.data || []);
        } else {
          const error = await res.json();
          alert(`❌ Erreur: ${error.error || error.message}`);
        }
      } catch (error) {
        console.error('Erreur:', error);
        alert('❌ Erreur de connexion');
      }
    };

    const vendreReservation = async (reservationId: number) => {
      if (!user) return;
      
      if (!confirm('💰 Confirmer la vente ? La réservation sera supprimée sans remettre le stock.')) {
        return;
      }

      try {
        // Suppression directe de la réservation SANS remettre le stock
        const res = await fetch('/api/reservations', {
          method: 'POST', // On va créer une route spécifique pour la vente
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'vente',
            id: reservationId,
            user_id: user.id
          }),
        });

        if (res.ok) {
          alert('✅ Vente effectuée ! Réservation supprimée.');
          fetchReservations(); // Rafraîchir la liste
        } else {
          const error = await res.json();
          alert(`❌ Erreur: ${error.error || error.message}`);
        }
      } catch (error) {
        console.error('Erreur:', error);
        alert('❌ Erreur de connexion');
      }
    };

    const setScannerNode = useCallback((node: HTMLDivElement | null) => {
      scannerRef.current = node;
      setScannerReady(!!node);
    }, []);
  /* fin  */


  /* recupére les isbn selon livre id */
  useEffect(() => {
    const recupereIsbnLivreId = async () => {
      try {
        // Récupérer tous les ISBN pour tous les livres
        const response = await fetch('/api/isbn?livre_id=all', { 
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });
        const result = await response.json();
        setIsbnList(result.data || []);
        console.log('📚 ISBN récupérés:', result.data);
      } catch (error) {
        console.error('Erreur récupération ISBN:', error);
      }
    };
    
    recupereIsbnLivreId();
  }, []);

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

  /* Système de debounce pour éviter les scans répétés */
  const lastScanTime = useRef<number>(0);
  const lastScannedCode = useRef<string>('');

  /* fonctionalité du scan ultra-rapide avec validation ISBN */
  const handleScan = (decodedText: string) => {
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
    setIsbn(cleanISBN);
    
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
  };

      const handleError = (errorMessage: string) => {
    console.error('Erreur de scan:', errorMessage);
  };
  
  // Fonction pour calculer le prix avec réduction
  const calculerPrixAvecReduction = (prixOriginal: number, quantite: number) => {
    const prixTotal = prixOriginal * quantite;
    
    if (valeurReduction === 0) return prixTotal;
    
    if (typeReduction === 'euros') {
      return Math.max(0, prixTotal - valeurReduction);
    } else {
      // Pourcentage
      const reduction = (prixTotal * valeurReduction) / 100;
      return Math.max(0, prixTotal - reduction);
    }
  };
  
     /* reserver un livre */
   const reserverLivre = (livre: InventaireItem) => {
     setLivreEnVente(livre);
     setQuantiteVente(500); // Quantité par défaut pour réservation
     setValeurReduction(0);
     setTypeReduction('euros');
     setModeModal('reservation'); // Mode réservation
     
     // Date par défaut : 7 jours à partir d'aujourd'hui
     const dateFuture = new Date();
     dateFuture.setDate(dateFuture.getDate() + 7);
     setDateReservation(dateFuture.toISOString().split('T')[0]);
     
     setReductionOpened(true); // Ouvre le modal
   };

   /* fonction pour bloquer les livres dans l'inventaire via ScannerResception */
   const reserverLivresInventaire = async (livre: InventaireItem, quantite: number, dateExpiration: string) => {
     if (!user) {
       alert("Utilisateur non connecté !");
       return;
     }

     // Récupérer les informations du client
     const clientName = (document.getElementById('clientName') as HTMLInputElement)?.value || '';
     const clientPhone = (document.getElementById('clientPhone') as HTMLInputElement)?.value || '';

     if (!clientName.trim()) {
       alert('❌ Veuillez saisir le nom du client');
       return;
     }

     try {
       const res = await fetch('/api/ScannerResception', {
         method: 'PUT', // Méthode dédiée aux blocages
         headers: { 
           'Content-Type': 'application/json',
           'user_id': user.id // Envoyer l'ID utilisateur
         },
         body: JSON.stringify({
           id: livre.id,
           quantite_a_bloquer: quantite,
           date_expiration: dateExpiration,
           name: clientName,
           telephone: clientPhone
         }),
       });

       if (res.ok) {
         alert(`✅ ${quantite} exemplaires de "${livre.title}" réservés jusqu'au ${new Date(dateExpiration).toLocaleDateString('fr-FR')} !`);
         setReductionOpened(false);
         // Rafraîchir l'inventaire
         const response = await fetch('/api/inventaire', { method: 'GET' });
         const result = await response.json();
         setInventaire(result.data || []);
         // Rafraîchir les réservations
         fetchReservations();
       } else {
         const error = await res.json();
         alert(`❌ Erreur lors de la réservation: ${error.error || error.message}`);
       }
     } catch (error) {
       console.error('Erreur:', error);
       alert('❌ Erreur de connexion');
     }
   };
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
      
      // Arrêter le stream immédiatement (on l'utilise juste pour débloquer les permissions)
      stream.getTracks().forEach(track => track.stop());
      return true;
      
    } catch (error) {
      console.error('❌ Échec de l\'accès forcé à la caméra Android:', error);
      return false;
    }
  };

  /* parametre du scanner */
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
                setAndroidCleanup(null);
              };
              
              // Stocker la fonction de nettoyage
              setAndroidCleanup(() => cleanup);
              
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
          // IOS : QuaggaJS ULTRA-RAPIDE
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
          
          // Appeler la fonction d'initialisation normale  
          initNormalScanner();
        }
      }
    }, [scannerOpened, scannerReady, scannerType]);
  /* fin scan */

    // Nettoyage quand le scanner se ferme
    useEffect(() => {
      if (!scannerOpened && scanner) {
        console.log('Scanner fermé, nettoyage des ressources...');
        
        // Si on a une fonction de nettoyage Android
        if (androidCleanup) {
          androidCleanup();
        } else if (scannerType === 'html5' && scanner instanceof Html5QrcodeScanner) {
          // Seulement si c'est une vraie instance de Html5QrcodeScanner
          scanner.clear();
        } else if (scannerType === 'quagga') {
          Quagga.stop();
        }
        
        setScanner(null);
        setAndroidCleanup(null);
      }
    }, [scannerOpened, scanner, scannerType, androidCleanup]);

    // Diagnostic quand le scanner s'ouvre
    useEffect(() => {
      if (scannerOpened) {
        console.log('🎯 Scanner ouvert - diagnostic en cours...');
        checkCompatibility();
      }
    }, [scannerOpened]);

    useEffect(() => {
      async function fetchInventaire() {
        try {
          const response = await fetch('/api/inventaire', { method: 'GET' });
          const result = await response.json();
          setInventaire(result.data || []);
        } catch {
          setInventaire([]);
        }
      }

      fetchInventaire();
    }, []);
    // filteredInventaire supprimé car il n'est pas utilisé

    // Fonction pour afficher les détails du livre
    const detailvre = (isbn: string) => {
      const livre = inventaire.find(item => item.isbn.toString() === isbn);
      if (livre) {
        setSelectedLivre(livre);
        setDetailOpened(true);
      }
    };

    // Suppression de la fonction inutilisée listeCommande

    const decrementInventaire = async (livre: InventaireItem, quantite: number) => {
      if (!quantite || quantite <= 0) {
        alert("Veuillez saisir une quantité à supprimer supérieure à 0.");
        return;
      }
      
      // Calculer la quantité disponible (stock - réservations)
      const quantiteReservee = livre.quantite_reservee || 0;
      const quantiteDisponible = livre.quantite - quantiteReservee;
      
      if (livre.quantite <= 0) {
        alert("Ce livre n'est pas en stock !");
        return;
      }
      
      if (quantiteDisponible <= 0) {
        alert(`❌ Impossible de vendre "${livre.title}" ! Tous les exemplaires (${quantiteReservee}) sont réservés.`);
        return;
      }
      
      if (quantite > quantiteDisponible) {
        alert(`❌ Stock insuffisant pour "${livre.title}" !\n📦 Stock total: ${livre.quantite}\n🔒 Réservé: ${quantiteReservee}\n✅ Disponible: ${quantiteDisponible}\n🛒 Demandé: ${quantite}`);
        return;
      }

      try {
        const res = await fetch('/api/ScannerResception', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: livre.id, supprimer: quantite, isbn: livre.isbn }),
        });

        if (!res.ok) throw new Error('Erreur lors de la décrémentation');

        const response = await fetch('/api/inventaire', { method: 'GET' });
        const result = await response.json();
        setInventaire(result.data || []);
        alert(`Quantité du livre "${livre.title}" décrémentée de ${quantite} !`);
        setFormOpened(false);
        setSupprimer(1);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error('Erreur:', message);
        alert('Erreur lors de la décrémentation');
      }
    };

    const ajouterCommande = async (livre: InventaireItem, quantite: number, prixFinal?: number) => {
      if (!user) {
        alert("Utilisateur non connecté !");
        return;
      }

      try {
        const res = await fetch('/api/commande', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            livre_id: livre.livre_id,
            quantite,
            user_id: user.id,
            vendeur: user.name,
            title: livre.title,
            prix_final: prixFinal || (livre.price * quantite), // Utiliser le prix avec réduction ou le prix normal
          }),
        });

        if (!res.ok) throw new Error("Erreur lors de l'ajout de la commande");

        const response = await fetch('/api/inventaire', { method: 'GET' });
        const result = await response.json();
        setInventaire(result.data || []);
        alert(`Commande ajoutée pour le livre "${livre.title}" avec la quantité ${quantite} !`);
        setFormOpened(false);
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        console.error('Erreur:', message);
        alert("Erreur lors de l'ajout de la commande");
      }
    };

    const validateAllScannedCodes = () => {
      console.log('🔍 Vérification de tous les codes scannés...', scannedCodes);
      
      // Vérifier TOUS les ISBNs pour trouver le livre
      let livreFound = null;
      let isbnTrouve = null;
      
      // Première passe : chercher un ISBN valide
      for (const code of scannedCodes) {
        console.log(`�� Vérification de l'ISBN: ${code}`);
        
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
        console.log(`�� Recherche du livre pour l'ISBN: ${isbnTrouve.isbn}`);
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
      
      // Décider selon les résultats
      if (livreFound) {
        // ✅ Livre trouvé : ouvrir le formulaire de décrémentation
        alert(`✅ Livre trouvé : ${livreFound.title}`);
        setIsbn(livreFound.isbn.toString());
        setSupprimer(1);
        setTimeout(() => setFormOpened(true), 500);
      } else {
        // ❌ Aucun livre trouvé : rediriger vers réception
        alert(`❌ Aucun livre trouvé en stock`);
        localStorage.setItem('autoOpenForm', 'true');
        localStorage.setItem('returnToCommande', 'true');
        localStorage.setItem('scannedIsbns', JSON.stringify(scannedCodes));
        window.location.href = '/inventaire/ScannerResception';
      }
    };

  /* ajouté un nouveaux livre */
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
      alert(`Quantité du livre "${livre.title}" incrémentée de ${ajout} !`);
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de l\'incrémentation');
    }
  };
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

  /* fin ajouté un nouveaux livre */


    return (
      <div className={stylesCommande.StyleCommandeGenerale}>
        {/* Header avec icône livre */}


        {/* Section montant principal */}
        <div className={stylesCommande.revolutAmount}>
          {/* Icônes de livres et dollars flottantes décoratives */}
          <div className={stylesCommande.floatingBooks}>
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
            
            {/* Dollars flottants */}
            <div className={stylesCommande.floatingDollar} style={{ top: '25%', left: '35%', animationDelay: '0.8s' }}>💵</div>
            <div className={stylesCommande.floatingDollar} style={{ top: '55%', right: '25%', animationDelay: '2.2s' }}>💰</div>
            <div className={stylesCommande.floatingDollar} style={{ top: '12%', right: '40%', animationDelay: '1.8s' }}>💸</div>
            <div className={stylesCommande.floatingDollar} style={{ top: '48%', left: '45%', animationDelay: '3.2s' }}>💲</div>
            <div className={stylesCommande.floatingDollar} style={{ top: '8%', left: '65%', animationDelay: '0.3s' }}>💴</div>
            <div className={stylesCommande.floatingDollar} style={{ top: '38%', right: '60%', animationDelay: '2.8s' }}>💶</div>
            <div className={stylesCommande.floatingDollar} style={{ top: '22%', left: '75%', animationDelay: '1.2s' }}>💷</div>
          </div>
          
          {/* Grosse icône caméra au centre */}
          <div className={stylesCommande.mainIconContainer}>
            <div className={stylesCommande.mainIcon} onClick={() => setScannerOpened(true)}>
              <IconCamera size={80} color="white" />
            </div>
          </div>  
          <div className={stylesCommande.revolutQuickActions}>

          </div>
        </div>

        {/* Carte blanche avec contenu produit - exactement comme l'image */}
        <div className={stylesCommande.productCard} style={{ position: 'fixed', bottom: '0', left: '0', right: '0' ,top: '350px'}}>
          <div className={stylesCommande.productHeader}>
            <div className={stylesCommande.productTitle}>Vos ventes</div>
            <div className={stylesCommande.productHeart}> </div>
          </div>
          
          <div className={stylesCommande.productDescription}>
          Ici , passeé la vente de vos livres  en toute sécurité , soiyez-benis , que les livres atteignes les nations 
          </div>
          <Center>
            <div className={stylesCommande.featureIcons}>

            <div  
              className={stylesCommande.featureIcon} 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('🏆 Bouton Vendre cliqué !');
                setVenteOpened(true);
                
              }}
              style={{ marginBottom: '0'}}
            >
              <span>🏆</span>
              <div className={stylesCommande.featureIconLabel}>Vendre</div>
            </div>
                
            <div 
              className={stylesCommande.featureIcon} 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('📅 Bouton Réservations cliqué !');
                setReservationsOpened(true);
              }}
              style={{ cursor: 'pointer' }}
            >
              <span>📅</span>
              <div className={stylesCommande.featureIconLabel}>Réservations</div>
            </div>

            <div 
              className={stylesCommande.featureIcon} 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('📥 Bouton CSV cliqué !');
                downloadCSV();
              }}
              style={{ cursor: 'pointer' }}
            >
              <span>📥</span>
              <div className={stylesCommande.featureIconLabel}>CSV</div>
            </div>
            </div>   
          </Center>
        
        </div>
    
        {/* Liste des livres */}
        {/*
        <div className={stylesCommande.transactionsList}>
          {loading ? (
            <Center>
              <Loader />
            </Center>
          ) : (
            filteredInventaire.map((item) => (
              <div key={item.id} onClick={() => detailvre(item.isbn.toString())} className={stylesCommande.transaction}>
                <div className={stylesCommande.transactionIcon}>{item.livre?.image ? <img src={item.livre.image} alt="Livre" style={{  width: '30px', height: '30px' }} /> : '📚'}</div>
                <div className={stylesCommande.transactionInfo}>
                  <div className={stylesCommande.transactionTitle}>{item.title}</div>
                  <div className={stylesCommande.transactionTime}>
                    👤 {item.author} | 📖 ISBN: {item.isbn}
                  </div>
                </div>
                <div className={stylesCommande.transactionAmount}>
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
  */}
        {/* Scanner en DIV plein écran */}
        {scannerOpened && (
          <div className={styles.scannerFullScreen}>
            {/* Header avec bouton fermer */}
            <div className={styles.scannerHeader}>
              <div onClick={() => setScannerOpened(false)} className={styles.scannerCloseButton} style={{ marginTop: '100px' }}>
                ✕ Fermer
              </div>
            </div>
            
            {/* Info performance */}
            <div style={{
              position: 'absolute',
              top: '60px',
              left: '20px',
              right: '20px',
              padding: '8px',
              borderRadius: '6px',
              zIndex: 1000
            }}>
            </div>
        
            {/* Container caméra avec liste transparente en overlay */}
            <div ref={setScannerNode} className={styles.cameraContainer}>
              <div id="reader" className={styles.reader}></div>
              
              {/* 📝 CHAMP DE SAISIE MANUELLE ISBN */}
              <div style={{ 
                position: 'absolute', 
                bottom: '20px', 
                left: '20px', 
                right: '20px',
                background: 'rgba(0,0,0,0.8)',
                padding: '15px',
                borderRadius: '10px',
                zIndex: 1000
              }}>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <TextInput
                    placeholder="Saisir ISBN 10 ou 13 chiffres"
                    value={isbn}
                    onChange={(e) => {
                      const value = e.currentTarget.value;
                      // Permettre seulement les chiffres, tirets et X
                      const cleanValue = value.replace(/[^0-9\-X]/g, '');
                      setIsbn(cleanValue);
                    }}
                    style={{ flex: 1 }}
                    styles={{
                      input: { 
                        backgroundColor: 'white', 
                        color: 'black',
                        fontSize: '14px'
                      }
                    }}
                    error={isbn && !isValidISBN(isbn) ? "Format ISBN invalide" : null}
                  />
                  <Button
                    size="sm"
                    color="green"
                    onClick={async () => {
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
                            setSupprimer(1);
                            setScannerOpened(false);
                            setTimeout(() => setFormOpened(true), 500);
                          } else {
                            alert(`✅ ISBN trouvé mais livre non en stock : ${isbnTrouve.isbn} (Livre ID: ${isbnTrouve.livre_id})`);
                          }
                        } else {
                          alert(`❌ ISBN non trouvé : ${cleanISBN}\n\n💡 Ce livre n'est peut-être pas dans votre base de données.`);
                        }
                      } else {
                        alert("Veuillez saisir un ISBN");
                      }
                    }}
                  >
                    ✅ Tester
                  </Button>
                </div>
              </div>
              
              {/* 📱 LISTE TRANSPARENTE EN TEMPS RÉEL - OVERLAY SUR LA CAMÉRA */}
              {showCodesList && scannedCodes.length > 0 && (
                <div className={styles.liveCodesList}>
                  <div className={styles.liveCodesHeader}>
                    <Text size="sm" c="white" fw={600}>
                      📋 {scannedCodes.length} code
                      {scannedCodes.length > 1 ? "s" : ""} détecté
                      {scannedCodes.length > 1 ? "s" : ""}
                    </Text>
                  </div>

                  <div className={styles.liveCodesContainer}>
                    {scannedCodes.map((code, index) => (
                      <div key={index} className={styles.liveCodeItem}>
                        <Text size="xs" c="white" className={styles.liveCodeText}>
                          📚 {code}
                        </Text>
                      </div>
                    ))}
                  </div>
                  <div className={styles.liveCodesFooter}>
                    <Button
                      size="sm"
                      color="blue"
                      onClick={validateAllScannedCodes}
                      style={{
                        marginBottom: "8px",
                        width: "100%",
                        fontWeight: "bold",
                      }}
                    >
                        ✅ {scannedCodes.length > 1 ? "VALIDER TOUS LES CODES" : "VALIDER LE CODE"}
                      
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
          </div>
        )}

        {/* Modal des commandes */}
        <Modal opened={commandeOpened} onClose={() => setCommandeOpened(false)} title="Commandes" centered size="sm">
          <Button onClick={downloadCSV}>Télécharger en CSV</Button>
            <div className={styles.tableContainer} style={{ maxWidth: '500px', maxHeight: '300px' }}>
              <Table.ScrollContainer minWidth={200} type="native">
              <Table striped highlightOnHover withColumnBorders>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Date</Table.Th>
                    <Table.Th>Utilisateur</Table.Th>
                    <Table.Th>title</Table.Th>
                    <Table.Th>Quantité</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {commandes.map((commande) => (
                    <Table.Tr key={commande.user_id + '-' + commande.title}>
                      <Table.Td>
                        {commande.date_achat ? formatDateTimeParis(commande.date_achat) : ''}
                      </Table.Td>
                      <Table.Td>{commande.vendeur}</Table.Td>
                      <Table.Td>{commande.title}</Table.Td>
                      <Table.Td>{commande.quantite}</Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Table.ScrollContainer>
          </div>
        </Modal>

        {/* Infos du livre scanné */}
        <Modal 
          opened={formOpened} 
          onClose={() => { setFormOpened(false); setSupprimer(1); }} 
          title="Informations du livre" 
          centered 
          size={isMobile ? "xs" : "md"}
          classNames={isMobile ? {
            header: styles.iosModalHeader,
            body: styles.iosModalBody,
            title: styles.iosModalTitle,
            content: styles.iosModalContent
          } : undefined}
        >
          {(() => {
            const livre = inventaire.find(item => item.isbn.toString() === isbn.trim());
            if (isbn && !livre) {
              // Si le livre n'est pas en stock, afficher le formulaire d'ajout
              return (
                <div style={{ width: 400, maxWidth: '80vw', margin: '0 auto' }}>
                  <Text color="orange" ta="center" size="lg" mb="xl">
                    📚 Livre non en stock - Ajouter à l&apos;inventaire
                  </Text>
                  
                  <TextInput 
                    label="ISBN" 
                    value={isbn}
                    readOnly 
                    mb="sm"
                  />
                  
                  <TextInput 
                    label="Titre du livre" 
                    placeholder="Saisir le titre"
                    mb="sm"
                    id="title"
                  />
                  
                  <TextInput 
                    label="Auteur" 
                    placeholder="Saisir l'auteur"
                    mb="sm"
                    id="author"
                  />
                  
                  <TextInput 
                    label="Prix" 
                    type="number"
                    placeholder="Prix en euros"
                    mb="sm"
                    id="price"
                  />
                  
                  <TextInput 
                    label="Quantité à ajouter" 
                    type="number"
                    min={1}
                    placeholder="Nombre d'exemplaires"
                    mb="md"
                    id="quantite"
                  />
                  
                  <Button
                    color="green"
                    fullWidth
                    onClick={async () => {
                      // Récupérer les valeurs des champs
                      const title = (document.getElementById('title') as HTMLInputElement)?.value || '';
                      const author = (document.getElementById('author') as HTMLInputElement)?.value || '';
                      const price = Number((document.getElementById('price') as HTMLInputElement)?.value || 0);
                      const quantiteAAjouter = Number((document.getElementById('quantite') as HTMLInputElement)?.value || 0);
                      
                      if (!title || !author || price <= 0 || quantiteAAjouter <= 0) {
                        alert('Veuillez remplir tous les champs correctement');
                        return;
                      }
                      
                      // Créer un objet livre temporaire pour incrementInventaire
                      const nouveauLivre: InventaireItem = {
                        id: 0, // ID temporaire
                        livre_id: 0, // Sera défini par l'API
                        title: title,
                        author: author,
                        quantite: 0, // Quantité actuelle
                        price: price,
                        isbn: Number(isbn)
                      };
                      
                      try {
                        await incrementInventaire(nouveauLivre, quantiteAAjouter);
                        setFormOpened(false);
                        alert('Livre ajouté avec succès à l\'inventaire !');
                      } catch (error) {
                        console.error('Erreur lors de l\'ajout:', error);
                        alert('Erreur lors de l\'ajout du livre');
                      }
                    }}
                  >
                    ✅ Ajouter à l&apos;inventaire
                  </Button>
                </div>
              );
            }
            if (livre) {
              return (
                <div className={isMobile ? styles.iosModalContent : ''} style={{ width: 400, maxWidth: '80vw', margin: '0 auto' , height: '100%' }}>
                  <TextInput 
                    label="ISBN" 
                    value={livre.isbn} 
                    readOnly 
                    mb="sm" 
                    classNames={isMobile ? { input: styles.iosModalInput } : undefined}
                  />
                  <TextInput 
                    label="Titre du livre" 
                    value={livre.title} 
                    readOnly 
                    mb="sm" 
                    classNames={isMobile ? { input: styles.iosModalInput } : undefined}
                  />
                  <TextInput 
                    label="Prix" 
                    value={livre.price} 
                    readOnly 
                    mb="sm" 
                    classNames={isMobile ? { input: styles.iosModalInput } : undefined}
                  />
                  <TextInput 
                    label="Quantité en stock" 
                    value={livre.quantite} 
                    readOnly 
                    mb="md" 
                    classNames={isMobile ? { input: styles.iosModalInput } : undefined}
                  />
                  <TextInput
                    label="Quantité à retirer"
                    type="number"
                    min={1}
                    max={livre.quantite}
                    value={supprimer}
                    onChange={e => setSupprimer(Number(e.target.value))}
                    mb="sm"
                    classNames={isMobile ? { input: styles.iosModalInput } : undefined}
                  />
                  <Center>
                <Button
                  mt="md"
                  onClick={() => {
                    setLivreEnVente(livre);
                    setQuantiteVente(supprimer);
                    setValeurReduction(0);
                    setTypeReduction('euros');
                    setModeModal('vente'); // Mode vente
                    setDateReservation(''); // Reset date
                    setFormOpened(false);
                    setReductionOpened(true);
                  }}
                  className={isMobile ? styles.iosModalButton : ''}
                >
                  Procéder à la vente
                </Button>
                <Button onClick={() => {
                  reserverLivre(livre);
                }}>Reserver</Button>
                </Center>
                </div>
              );
            }
            return null;
          })()}
        </Modal>

        <Modal   opened={detailOpened}     onClose={() => setDetailOpened(false)}   title="Détails du livre"     centered    size="xs">
          {selectedLivre && (
            <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              {/* Image du livre */}
              <div style={{ marginBottom: '15px' }}>
                {selectedLivre.livre?.image ? (
                  <img 
                    src={selectedLivre.livre.image} 
                    alt={selectedLivre.title} 
                    style={{ 
                      width: '100px', 
                      height: '150px', 
                      objectFit: 'cover',
                      borderRadius: '8px',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                    }} 
                  />
                ) : (
                  <div style={{ 
                    width: '120px', 
                    height: '150px', 
                    backgroundColor: '#f0f0f0',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '32px'
                  }}>
                    📚
                  </div>
                )}
              </div>

              {/* Informations du livre */}
              <div style={{ 
                textAlign: 'left', 
                backgroundColor: '#1a1a1a', 
                padding: '20px', 
                borderRadius: '10px',
                color: 'white'
              }}>
                <Text size="xl" fw={700} mb="sm" c="white">
                  {selectedLivre.title}
                </Text>
                <Text size="lg" c="white" mb="md">
                  👤 {selectedLivre.author}
                </Text>
                <Text size="md" c="white" mb="sm">
                  📖 ISBN: {selectedLivre.isbn}
                </Text>
                <Text size="md" c="white" mb="sm">
                  💰 Prix: {selectedLivre.price}€
                </Text>
                <Text size="md" c="white" mb="md">
                  📦 Quantité en stock: {selectedLivre.quantite} exemplaire{selectedLivre.quantite > 1 ? 's' : ''}
                </Text>
              </div>

              {/* Boutons d'action */}
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '15px' }}>
                <Button 
                  size="sm"
                  color="blue" 
                  onClick={() => {
                    setIsbn(selectedLivre.isbn.toString());
                    setSupprimer(1);
                    setDetailOpened(false);
                    setTimeout(() => setFormOpened(true), 500);
                  }}
                >
                  vendre
                </Button>
              </div>
            </div>
          )}
        </Modal>

        {/* Modale de liste des commandes */}
        <Modal 
          opened={listeCommandeOpened} 
          onClose={() => setListeCommandeOpened(false)} 
          title="Détails des commandes" 
          centered 
          size="xl"
        >
          <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text size="lg" fw={600}>
              📋 Historique des commandes ({commandes.length})
            </Text>
            <Button 
              onClick={downloadCSV}
              color="green"
              size="sm"
              leftSection="📥"
            >
              Télécharger CSV
            </Button>
          </div>

          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {commandes.length === 0 ? (
              <Text c="dimmed" ta="center" py="xl">
                Aucune commande trouvée
              </Text>
            ) : (
              <Table striped highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>📅 Date</Table.Th>
                    <Table.Th>👤 Utilisateur</Table.Th>
                    <Table.Th>📚 Titre</Table.Th>
                    <Table.Th>📦 Quantité</Table.Th>
                    <Table.Th>💰 Prix unitaire</Table.Th>
                    <Table.Th>💵 Total</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {commandes.map((commande, index) => (
                    <Table.Tr key={index}>
                      <Table.Td>
                        {new Date(commande.date_achat).toLocaleDateString('fr-FR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </Table.Td>
                      <Table.Td>
                        {commande.vendeur || commande.user?.name || 'Inconnu'}
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm" fw={500}>
                          {commande.title}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm" c="blue" fw={600}>
                          {commande.quantite}x
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm" c="green">
                          {/* Utiliser le prix réel de vente ou fallback sur l'inventaire */}
                          {commande.price ? `${commande.price.toFixed(2)}€` : (() => {
                            const livre = inventaire.find(item => item.title === commande.title);
                            return livre ? `${livre.price}€` : 'N/A';
                          })()}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm" fw={700} c="green">
                          {/* Calculer le total avec le prix réel de vente */}
                          {commande.price ? `${(commande.price * commande.quantite).toFixed(2)}€` : (() => {
                            const livre = inventaire.find(item => item.title === commande.title);
                            return livre ? `${(livre.price * commande.quantite).toFixed(2)}€` : 'N/A';
                          })()}
                        </Text>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            )}
          </div>

          <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
            <Text size="sm" c="dimmed">
              💡 Le fichier CSV contient toutes les commandes avec leurs détails pour analyse
            </Text>
          </div>
        </Modal>

        {/* Modale de liste des livres pour vente */}
        <Modal 
          opened={listeCommandeOpened} 
          onClose={() => setListeCommandeOpened(false)} 
          title="📚 Liste des livres disponibles à la vente" 
          centered 
          size="xl"
        >
                {/*bar de recherche */}
          <div style={{ marginBottom: '20px' }}>
            <TextInput
              placeholder="🔍 Rechercher un livre par titre, auteur ou ISBN..."
              value={search}
              onChange={(e) => setSearch(e.currentTarget.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === 'Escape') {
                  e.currentTarget.blur(); // Désactive le clavier
                  (document.activeElement as HTMLElement)?.blur(); // Force la désactivation du focus
                }
              }}
              style={{ marginBottom: '15px' }}
              styles={{
                input: { 
                  borderRadius: '10px',
                  border: '2px solid #e0e0e0',
                  fontSize: '16px', // Empêche le zoom sur iOS
                  transform: 'scale(1)', // Empêche le zoom
                  touchAction: 'manipulation' // Empêche le zoom sur mobile
                }
              }}
              inputMode="search" // Type de clavier optimisé pour la recherche
              autoComplete="off" // Désactive l'autocomplétion
            />

          </div>

          <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
            {inventaire.length === 0 ? (
              <Text c="dimmed" ta="center" py="xl">
                Aucun livre en stock
              </Text>
            ) : (
              <div className={stylesCommande.transactionsList}>
                {inventaire.filter(item => 
                  item.title.toLowerCase().includes(search.toLowerCase()) ||
                  item.author.toLowerCase().includes(search.toLowerCase()) ||
                  item.isbn.toString().includes(search)
                ).map((item) => (
                  <div key={item.id} onClick={() => {
                    detailvre(item.isbn.toString());
                    setListeCommandeOpened(false);
                  }} className={stylesCommande.transaction}>
                    <div className={stylesCommande.transactionIcon}>
                      {item.livre?.image ? 
                        <img src={item.livre.image} alt="Livre" style={{ width: '30px', height: '30px' }} /> 
                        : '📚'
                      }
                    </div>
                    <div className={stylesCommande.transactionInfo}>
                      <div className={stylesCommande.transactionTitle}>{item.title}</div>
                      <div className={stylesCommande.transactionTime}>
                        👤 {item.author} | 📖 ISBN: {item.isbn}
                      </div>
                    </div>
                    <div className={stylesCommande.transactionAmount}>
                      <div style={{ fontSize: '14px', fontWeight: 'bold' }}>
                        {item.quantite}x
                      </div>
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        {item.price}€
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
            <Text size="sm" c="dimmed">
              💡 Cliquez sur un livre pour voir ses détails et le vendre
            </Text>
          </div>
        </Modal>

        {/* Modale de vente - Liste des livres pour vente */}
        <Modal 
          opened={venteOpened} 
          onClose={() => setVenteOpened(false)} 
          title="📚 Liste des livres disponibles à la vente" 
          centered 
          size="xl"
        >
          {/*bar de recherche */}
          <div style={{ marginBottom: '20px' }}>
            <TextInput
              placeholder="🔍 Rechercher un livre par titre, auteur ou ISBN..."
              value={search}
              onChange={(e) => setSearch(e.currentTarget.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === 'Escape') {
                  e.currentTarget.blur(); // Désactive le clavier
                  (document.activeElement as HTMLElement)?.blur(); // Force la désactivation du focus
                }
              }}
              style={{ marginBottom: '15px' }}
              styles={{
                input: { 
                  borderRadius: '10px',
                  border: '2px solid #e0e0e0',
                  fontSize: '16px', // Empêche le zoom sur iOS
                  transform: 'scale(1)', // Empêche le zoom
                  touchAction: 'manipulation' // Empêche le zoom sur mobile
                }
              }}
              inputMode="search" // Type de clavier optimisé pour la recherche
              autoComplete="off" // Désactive l'autocomplétion
            />
          </div>

          <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
            {inventaire.length === 0 ? (
              <Text c="dimmed" ta="center" py="xl">
                Aucun livre en stock
              </Text>
            ) : (
              <div className={stylesCommande.transactionsList}>
                {inventaire.filter(item => 
                  item.title.toLowerCase().includes(search.toLowerCase()) ||
                  item.author.toLowerCase().includes(search.toLowerCase()) ||
                  item.isbn.toString().includes(search)
                ).map((item) => (
                  <div key={item.id} onClick={() => {
                    detailvre(item.isbn.toString());
                    setVenteOpened(false);
                  }} className={stylesCommande.transaction}>
                    <div className={stylesCommande.transactionIcon}>
                      {item.livre?.image ? 
                        <img src={item.livre.image} alt="Livre" style={{ width: '30px', height: '30px' }} /> 
                        : '📚'
                      }
                    </div>
                    <div className={stylesCommande.transactionInfo}>
                      <div className={stylesCommande.transactionTitle}>{item.title}</div>
                      <div className={stylesCommande.transactionTime}>
                        👤 {item.author} | 📖 ISBN: {item.isbn}
                      </div>
                    </div>
                    <div className={stylesCommande.transactionAmount}>
                      <div style={{ fontSize: '14px', fontWeight: 'bold' }}>
                        {item.quantite}x
                      </div>
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        {item.price}€
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
            <Text size="sm" c="dimmed">
              💡 Cliquez sur un livre pour voir ses détails et le vendre
            </Text>
          </div>
        </Modal>

        {/* Modale de réduction */}
        <Modal 
          opened={reductionOpened} 
          onClose={() => setReductionOpened(false)} 
          title={modeModal === 'reservation' ? "📅 Réserver des livres" : "💰 Appliquer une réduction"} 
          centered 
          size="sm"
        >
          {livreEnVente && (
            <div style={{ padding: '10px' }}>
              {/* Résumé de la vente */}
              <div style={{ 
                backgroundColor: '#f8f9fa', 
                padding: '15px', 
                borderRadius: '8px', 
                marginBottom: '20px' 
              }}>
                <Text size="sm" fw={600} mb="xs">📚 {livreEnVente.title}</Text>
                <Text size="sm" c="dimmed" mb="xs">Quantité: {quantiteVente}x</Text>
                <Text size="sm" c="dimmed" mb="xs">Prix unitaire: {livreEnVente.price}€</Text>
                <Text size="sm" fw={600}>
                  Prix total: {(livreEnVente.price * quantiteVente).toFixed(2)}€
                </Text>
              </div>

              {/* Sélection de la quantité */}
              <NumberInput
                label={modeModal === 'reservation' ? "📦 Quantité à réserver" : "📚 Quantité à vendre"}
                value={quantiteVente}
                onChange={(value) => setQuantiteVente(Number(value) || 1)}
                min={1}
                max={modeModal === 'reservation' ? 10000 : (livreEnVente.quantite - (livreEnVente.quantite_reservee || 0))}
                step={modeModal === 'reservation' ? 10 : 1}
                placeholder={modeModal === 'reservation' ? "Ex: 500, 1000, 2000..." : "Quantité"}
                description={modeModal === 'reservation' ? 
                  `Stock total: ${livreEnVente.quantite} exemplaires` : 
                  `Stock disponible: ${livreEnVente.quantite - (livreEnVente.quantite_reservee || 0)} exemplaires (${livreEnVente.quantite_reservee || 0} réservés)`
                }
                mb="md"
              />

              {/* Champ spécifique à la réservation */}
              {modeModal === 'reservation' ? (
                <>
                  <TextInput
                    label="👤 Nom du client"
                    placeholder="Nom et prénom du client"
                    mb="sm"
                    required
                    id="clientName"
                  />
                  <TextInput
                    label="📞 Téléphone du client"
                    placeholder="Numéro de téléphone"
                    mb="sm"
                    id="clientPhone"
                  />
                  <TextInput
                    label="📅 Date d&apos;expiration de la réservation"
                    type="date"
                    value={dateReservation}
                    onChange={(e) => setDateReservation(e.currentTarget.value)}
                    mb="md"
                    required
                  />
                </>
              ) : (
                <>
                  {/* Type de réduction */}
                  <Text size="sm" fw={600} mb="xs">Type de réduction :</Text>
                  <Radio.Group
                    value={typeReduction}
                    onChange={(value) => setTypeReduction(value as 'euros' | 'pourcentage')}
                    mb="md"
                  >
                    <Radio value="euros" label="💵 En euros" />
                    <Radio value="pourcentage" label="📊 En pourcentage" />
                  </Radio.Group>

                  {/* Valeur de la réduction */}
                  <TextInput
                    label={`Valeur de la réduction ${typeReduction === 'euros' ? '(€)' : '(%)'}`}
                    type="number"
                    min={0}
                    max={typeReduction === 'pourcentage' ? 100 : livreEnVente.price * quantiteVente}
                    value={valeurReduction}
                    onChange={(e) => setValeurReduction(Number(e.currentTarget.value))}
                    placeholder={`Saisir la réduction en ${typeReduction === 'euros' ? 'euros' : 'pourcentage'}`}
                    mb="md"
                  />
                </>
              )}

              {/* Aperçu du prix final ou info réservation */}
              {modeModal === 'reservation' ? (
                <div style={{ 
                  backgroundColor: '#fff3cd', 
                  padding: '15px', 
                  borderRadius: '8px', 
                  marginBottom: '20px' 
                }}>
                  <Text size="sm" fw={600} c="orange">📦 Réservation</Text>
                  <Text size="sm" c="dimmed">Quantité à bloquer: {quantiteVente} exemplaires</Text>
                  {dateReservation && (
                    <Text size="sm" c="dimmed">
                      Jusqu&apos;au: {new Date(dateReservation).toLocaleDateString('fr-FR')}
                    </Text>
                  )}
                  <Text size="lg" fw={700} c="orange">
                    📅 Stock bloqué temporairement
                  </Text>
                </div>
              ) : (
                <div style={{ 
                  backgroundColor: '#e3f2fd', 
                  padding: '15px', 
                  borderRadius: '8px', 
                  marginBottom: '20px' 
                }}>
                  <Text size="sm" c="dimmed">Prix original: {(livreEnVente.price * quantiteVente).toFixed(2)}€</Text>
                  {valeurReduction > 0 && (
                    <Text size="sm" c="red">
                      Réduction: -{typeReduction === 'euros' 
                        ? `${valeurReduction.toFixed(2)}€` 
                        : `${valeurReduction}% (${((livreEnVente.price * quantiteVente * valeurReduction) / 100).toFixed(2)}€)`
                      }
                    </Text>
                  )}
                  <Text size="lg" fw={700} c="green">
                    💰 Prix final: {calculerPrixAvecReduction(livreEnVente.price, quantiteVente).toFixed(2)}€
                  </Text>
                </div>
              )}

              {/* Boutons d'action */}
              <div style={{ display: 'flex', gap: '10px' }}>
                <Button
                  variant="outline"
                  onClick={() => setReductionOpened(false)}
                  style={{ flex: 1 }}
                >
                  Annuler
                </Button>
                <Button
                  color={modeModal === 'reservation' ? 'orange' : 'green'}
                  onClick={async () => {
                    if (livreEnVente) {
                      if (modeModal === 'reservation') {
                        // Mode réservation : bloquer le stock
                        if (!dateReservation) {
                          alert('❌ Veuillez sélectionner une date d\'expiration');
                          return;
                        }
                        await reserverLivresInventaire(livreEnVente, quantiteVente, dateReservation);
                      } else {
                        // Mode vente : procéder à la vente
                        const prixFinal = calculerPrixAvecReduction(livreEnVente.price, quantiteVente);
                        const prixOriginal = livreEnVente.price * quantiteVente;
                        
                        await decrementInventaire(livreEnVente, quantiteVente);
                        await ajouterCommande(livreEnVente, quantiteVente, prixFinal);
                        
                        if (valeurReduction > 0) {
                          const economie = prixOriginal - prixFinal;
                          alert(`✅ Vente effectuée !\n💰 Prix final: ${prixFinal.toFixed(2)}€\n🎉 Économie: ${economie.toFixed(2)}€`);
                        } else {
                          alert(`✅ Vente effectuée pour ${prixFinal.toFixed(2)}€`);
                        }
                        
                        setReductionOpened(false);
                        setLivreEnVente(null);
                        setValeurReduction(0);
                      }
                    }
                  }}
                  style={{ flex: 1 }}
                >
                  {modeModal === 'reservation' ? '📅 Confirmer la réservation' : '✅ Confirmer la vente'}
                </Button>
              </div>
            </div>
          )}
        </Modal>

        {/* Modale des réservations */}
        <Modal 
          opened={reservationsOpened} 
          onClose={() => setReservationsOpened(false)} 
          title="📅 Mes réservations" 
          centered 
          size="xl"
        >
          <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text size="lg" fw={600}>
              📋 Mes réservations actives ({reservations.length})
            </Text>
            <Button 
              onClick={fetchReservations}
              color="blue"
              size="sm"
              leftSection="🔄"
            >
              Actualiser
            </Button>
          </div>

          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {reservations.length === 0 ? (
              <Text c="dimmed" ta="center" py="xl">
                Aucune réservation trouvée
              </Text>
            ) : (
              <Table striped highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>📚 Livre</Table.Th>
                    <Table.Th>👤 Client</Table.Th>
                    <Table.Th>📦 Quantité</Table.Th>
                    <Table.Th>📅 Expire le</Table.Th>
                    <Table.Th>🕒 Créée le</Table.Th>
                    <Table.Th>⚡ Action</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {reservations.map((reservation) => {
                    const isExpired = new Date(reservation.date_expiration) < new Date();
                    const daysLeft = Math.ceil((new Date(reservation.date_expiration).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                    
                    return (
                                              <Table.Tr key={reservation.id}>
                          <Table.Td>
                            <div>
                              <Text size="sm" fw={600}>
                                {reservation.inventaire?.title || 'Titre non disponible'}
                              </Text>
                              <Text size="xs" c="dimmed">
                                👤 {reservation.inventaire?.author || 'Auteur inconnu'}
                              </Text>
                              <Text size="xs" c="dimmed">
                                📖 ISBN: {reservation.inventaire?.isbn || 'N/A'}
                              </Text>
                            </div>
                          </Table.Td>
                          <Table.Td>
                            <div>
                              <Text size="sm" fw={600}>
                                {reservation.name || 'Non renseigné'}
                              </Text>
                              <Text size="xs" c="dimmed">
                                📞 {reservation.telephone || 'Non renseigné'}
                              </Text>
                            </div>
                          </Table.Td>
                          <Table.Td>
                            <Text size="sm" c="blue" fw={600}>
                              {reservation.quantite_bloquee}x
                            </Text>
                          </Table.Td>
                        <Table.Td>
                          <div>
                            <Text size="sm" c={isExpired ? "red" : daysLeft <= 2 ? "orange" : "green"}>
                              {new Date(reservation.date_expiration).toLocaleDateString('fr-FR')}
                            </Text>
                            {!isExpired && (
                              <Text size="xs" c={daysLeft <= 2 ? "orange" : "dimmed"}>
                                {daysLeft > 0 ? `${daysLeft} jour(s) restant(s)` : 'Expire aujourd\'hui'}
                              </Text>
                            )}
                            {isExpired && (
                              <Text size="xs" c="red" fw={600}>
                                ⚠️ Expirée
                              </Text>
                            )}
                          </div>
                        </Table.Td>
                        <Table.Td>
                          <Text size="xs" c="dimmed">
                            {new Date(reservation.date_creation).toLocaleDateString('fr-FR', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Button
                            size="xs"
                            color="red"
                            variant="outline"
                            onClick={() => annulerReservation(reservation.id)}
                          >
                            🗑️ Annuler
                          </Button>
                        </Table.Td>
                        <Table.Td>
                          <Button
                            size="xs"
                            color="green"
                            variant="outline"
                            onClick={() => vendreReservation(reservation.id)}
                          >
                            📦 vendre
                          </Button>
                        </Table.Td>
                      </Table.Tr>
                    );
                  })}
                </Table.Tbody>
              </Table>
            )}
          </div>

          <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
            <Text size="sm" c="dimmed">
              💡 Les réservations bloquent temporairement le stock. Vous pouvez les annuler pour remettre les livres en vente.
            </Text>
          </div>
        </Modal>
      </div>
    );
  }
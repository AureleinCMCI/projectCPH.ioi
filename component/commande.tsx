'use client';

import Quagga, { QuaggaJSResultCallbackFunction, QuaggaJSResultObject } from '@ericblade/quagga2';
import { Button, Center, Image, Input, Modal, NumberInput, Pagination, Radio, Table, Text, TextInput } from '@mantine/core';
import { IconCamera } from '@tabler/icons-react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { jwtDecode } from 'jwt-decode';
import { useCallback, useEffect, useRef, useState } from 'react';

import styles from './style/ScannerResception.module.css';

import stylesCommande from './style/commande.module.css';


// Interface pour BarcodeDetector
interface BarcodeDetectorInterface {
  new(options: { formats: string[] }): {
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
    } catch { }
  }
}

// Composant affichant les commandes

function formatDateTimeParis(dateString: string) {
  const date = new Date(dateString);
  const options: Intl.DateTimeFormatOptions = {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
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
  const [page, setPage] = useState(1);
  const [livres, setLivres] = useState<InventaireItem[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const PAGE_SIZE = 20;
  const [livresLoading, setLivresLoading] = useState(false);
  const [supprimer, setSupprimer] = useState<number>(1);
  const [quantiteAjouter, setQuantiteAjouter] = useState<number>(1);
  const [commandeOpened, setCommandeOpened] = useState(false);
  const [commandes, setCommandes] = useState<{
    user_id: number; date_achat: string; title: string; quantite: number; price?: number; vendeur?: string; user?: { name?: string };
  }[]>([]);
  const [isMobile, setIsMobile] = useState(false); // Détection mobile
  const [scanner, setScanner] = useState<Html5QrcodeScanner | boolean | null>(null);
  const [scannerType, setScannerType] = useState<'html5' | 'quagga'>('html5');
  const [androidCleanup, setAndroidCleanup] = useState<(() => void) | null>(null);
  const [showCodesList, setShowCodesList] = useState(false);
  const [scannedCodes, setScannedCodes] = useState<string[]>([]);
  const [isbnList, setIsbnList] = useState<{ isbn: number; livre_id: number }[]>([]);
  const [panierApiItems, setPanierApiItems] = useState<{
    id: number;
    quantity: number;
    added_at: string;
    livre?: { id: number; isbn: number; author: string; title: string };
    inventaire?: { price: number };
  }[]>([]);


  const [panierApiLoading, setPanierApiLoading] = useState(false);

  const [detailOpened, setDetailOpened] = useState(false);
  const [selectedLivre, setSelectedLivre] = useState<InventaireItem | null>(null);

  const [listeCommandeOpened, setListeCommandeOpened] = useState(false);

  const [venteOpened, setVenteOpened] = useState(false);

  useEffect(() => {
    if (!venteOpened) return;
    const abort = new AbortController();

    const fetchPage = async () => {
      try {
        setLivresLoading(true);
        const res = await fetch(`/api/inventaire?page=${page}`, { signal: abort.signal });
        if (!res.ok) {
          console.error('Erreur fetch inventaire page', res.status);
          setLivres([]);
          setTotalPages(1);
          return;
        }
        const json = await res.json();
        const pageSize = Number(json.pageSize ?? PAGE_SIZE);
        const pageData = Array.isArray(json.data) ? json.data : [];
        setLivres(pageData);
        const total = typeof json.total === 'number' ? Number(json.total) : null;
        if (total !== null) {
          setTotalPages(Math.max(1, Math.ceil(total / pageSize)));
        } else {
          if (pageData.length < pageSize) {
            setTotalPages(page);
          } else {
            setTotalPages(page + 1);
          }
        }
      } catch (err: any) {
        if (err.name === 'AbortError') return;
        console.error('Erreur chargement livres:', err);
      } finally {
        setLivresLoading(false);
      }
    };

    fetchPage();
    return () => abort.abort();
  }, [page, venteOpened]);

  const [confirmReductionOpened, setConfirmReductionOpened] = useState(false);

  const [reductionOpened, setReductionOpened] = useState(false);
  const [livreEnVente, setLivreEnVente] = useState<InventaireItem | null>(null);
  const [quantiteVente, setQuantiteVente] = useState(1);
  const [typeReduction, setTypeReduction] = useState<'euros' | 'pourcentage'>('euros');
  const [valeurReduction, setValeurReduction] = useState(0);
  const [modeModal, setModeModal] = useState<'vente' | 'reservation'>('vente');
  const [dateReservation, setDateReservation] = useState('');
  const [panierOpened, setPanierOpened] = useState(false);
  const [panier, setPanier] = useState<InventaireItem[]>([]);
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
  // à ajouter au panier depuis la modale de détails
  const [quantitePanier, setQuantitePanier] = useState<number>(1);
  // Préférence d'utilisation de la caméra arrière
  const [preferBack, setPreferBack] = useState<boolean>(false);

  // État pour la modale du panier

  // État pour la modal d'ajout au stock
  const [addStockModalOpened, setAddStockModalOpened] = useState(false);
  const [selectedLivreForStock, setSelectedLivreForStock] = useState<InventaireItem | null>(null);
  const [stockAdded, setStockAdded] = useState(false);
  const [showQuantitySelection, setShowQuantitySelection] = useState(false);

  const ajouterAuPanier = async (livre: InventaireItem, quantite: number = 1) => {
    try {
      const response = await fetch('/api/panier', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user?.id,
          livre_id: livre.livre_id,
          quantity: Math.max(1, quantite)
        })
      });
      const result = await response.json();
      setPanier(result.data || []);
    } catch (error) {
      console.error("Erreur lors de l'ajout au panier :", error);
    }
  };
  /* Fonction supprimer un livre du panier de la base de donnés delete*/
  const supprimerDuPanier = (itemId: number) => {
    try {
      fetch(`/api/panier?item_id=${itemId}`, { method: 'DELETE' })
        .then(res => res.json())
        .then(data => {
          console.log('✅ Article supprimé du panier:', data);
          // Recharger le panier API
          fetchPanierApi();
        });
    } catch (error) {
      console.error("Erreur lors de la suppression du panier :", error);
    }
  };

  /* Fonction pour vider complètement le panier */
  const viderPanier = async () => {
    if (!user) return;

    try {
      // Supprimer tous les articles du panier de cet utilisateur
      for (const item of panierApiItems) {
        await fetch(`/api/panier?item_id=${item.id}`, { method: 'DELETE' });
      }

      // Recharger le panier vide
      setPanierApiItems([]);
      setPanier([]);
      console.log('🗑️ Panier vidé avec succès');
    } catch (error) {
      console.error("Erreur lors du vidage du panier :", error);
    }
  };

  // Charger le panier depuis l'API /api/panier (panier_item + livre)
  const fetchPanierApi = async () => {
    if (!user) return;
    try {
      setPanierApiLoading(true);
      const res = await fetch(`/api/panier?user_id=${user.id}`, { method: 'GET' });
      const data = await res.json();
      setPanierApiItems(Array.isArray(data.data) ? data.data : []);
    } catch (error) {
      console.error('Erreur chargement panier API:', error);
      setPanierApiItems([]);
    } finally {
      setPanierApiLoading(false);
    }
  };



  // Fonction pour valider la vente de tous les livres du panier
  const validerVentePanier = async () => {
    if (panierApiItems.length === 0) {
      alert('❌ Le panier est vide !');
      return;
    }

    if (!user) {
      alert('❌ Utilisateur non connecté !');
      return;
    }

    try {
      let ventesReussies = 0;
      let ventesEchouees = 0;
      const erreurs: string[] = [];
      // Calculer la réduction sur le total du panier
      const resultatsReduction = calculerReductionPanier();
      console.log('📊 Calculs de réduction:', resultatsReduction);
      // Générer un ID unique pour cette transaction
      const transactionId = `TXN_${Date.now()}_${user.id}`;
      // Traiter chaque article du panier avec les prix calculés après réduction
      for (const itemAvecReduction of resultatsReduction.itemsAvecReduction) {
        try {
          const livre = inventaire.find(inv => inv.livre_id === itemAvecReduction.livre?.id);

          if (!livre) {
            erreurs.push(`❌ "${itemAvecReduction.livre?.title || 'Livre inconnu'}" : Livre non trouvé dans l'inventaire`);
            ventesEchouees++;
            continue;
          }
          const quantiteReservee = livre.quantite_reservee || 0;
          const quantiteDisponible = livre.quantite - quantiteReservee;
          const quantiteAVendre = itemAvecReduction.quantity || 1;

          if (quantiteDisponible < quantiteAVendre) {
            erreurs.push(`❌ "${livre.title}" : Stock insuffisant (${quantiteDisponible} disponibles, ${quantiteAVendre} demandés)`);
            ventesEchouees++;
            continue;
          }

          // Utiliser le prix unitaire final calculé avec la réduction répartie
          const prixFinalUnitaire = itemAvecReduction.prixUnitaireFinal;

          // Préparer les informations de transaction
          const transactionInfo = {
            transaction_id: transactionId,
            prix_original_unitaire: itemAvecReduction.inventaire?.price || 0,
            reduction_appliquee: itemAvecReduction.reductionAppliquee,
            type_reduction: typeReduction,
            valeur_reduction: valeurReduction,
            total_transaction_original: resultatsReduction.totalOriginal,
            total_transaction_final: resultatsReduction.totalAvecReduction
          };

          // 1. Décrémenter l'inventaire
          await decrementInventaire(livre, quantiteAVendre);

          // 2. Enregistrer la commande avec toutes les informations de transaction
          await ajouterCommande(livre, quantiteAVendre, prixFinalUnitaire, transactionInfo);

          ventesReussies++;
          console.log(`✅ Vente réussie: ${livre.title} x${quantiteAVendre} (prix final: ${itemAvecReduction.prixFinal.toFixed(2)}€, réduction: ${itemAvecReduction.reductionAppliquee.toFixed(2)}€)`);

        } catch (error) {
          console.error(`❌ Erreur lors de la vente de ${itemAvecReduction.livre?.title}:`, error);
          erreurs.push(`❌ "${itemAvecReduction.livre?.title || 'Livre inconnu'}" : Erreur lors de la vente`);
          ventesEchouees++;
        }
      }

      if (ventesReussies > 0) {
        const messageReduction = resultatsReduction.montantReduction > 0 ?
          `\n💰 Prix original: ${resultatsReduction.totalOriginal.toFixed(2)}€\n🎉 Réduction appliquée: ${resultatsReduction.montantReduction.toFixed(2)}€\n💵 Prix final: ${resultatsReduction.totalAvecReduction.toFixed(2)}€\n🆔 Transaction: ${transactionId}` :
          `\n🆔 Transaction: ${transactionId}`;

        const message = `✅ Ventes effectuées avec succès !${messageReduction}\n\n📊 Résumé:\n• ${ventesReussies} vente(s) réussie(s)\n• ${ventesEchouees} échec(s)`;

        if (erreurs.length > 0) {
          alert(`${message}\n\n❌ Erreurs:\n${erreurs.join('\n')}`);
        } else {
          alert(message);
        }
        viderPanier();
        setPanierOpened(false);
      } else {
        alert(`❌ Aucune vente n'a pu être effectuée !\n\nErreurs:\n${erreurs.join('\n')}`);
      }

    } catch (error) {
      console.error('❌ Erreur lors de la validation du panier:', error);
      alert('❌ Erreur lors de la validation du panier');
    }
  };

  // Charger le panier au démarrage


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
  }

  // Récupère le deviceId de la caméra arrière si disponible (après permission)

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

  /* fonction pour ajouter un livre au panier */

  /* fonction pour supprimer un livre du panier */

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

  const SCANNER_CONFIG = {
    fps: 30,
    frequency: 30,
    debounceDelay: 200,
    validationTimeout: 100,
    workers: 4,
    confidenceThreshold: 0.3,
  };

  /* Cache pour optimiser les validations ISBN répétées */
  const isbnValidationCache = useRef<Map<string, boolean>>(new Map());

  /* Fonction de validation ISBN flexible */
  const isValidISBN = (code: string): boolean => {
    // Vérifier le cache d'abord
    if (isbnValidationCache.current.has(code)) {
      return isbnValidationCache.current.get(code)!;
    }

    // Nettoyer le code (supprimer espaces, tirets, etc.)
    const cleanCode = code.replace(/[\s-]/g, '');

    // Validation plus flexible - accepter plus de formats
    const len = cleanCode.length;

    // Accepter les codes de 8 à 15 caractères (plus flexible)
    if (len < 8 || len > 15) {
      isbnValidationCache.current.set(code, false);
      return false;
    }

    // Vérifier que c'est principalement numérique
    const numericCount = (cleanCode.match(/[0-9]/g) || []).length;
    const alphaCount = (cleanCode.match(/[A-Za-z]/g) || []).length;

    // Accepter si au moins 80% de chiffres ou contient des lettres valides
    if (numericCount < len * 0.8 && alphaCount === 0) {
      isbnValidationCache.current.set(code, false);
      return false;
    }

    console.log(`✅ Code valide détecté: ${cleanCode} (${len} caractères)`);
    isbnValidationCache.current.set(code, true);
    return true;
  };

  /* Système de debounce pour éviter les scans répétés */
  const lastScanTime = useRef<number>(0);
  const lastScannedCode = useRef<string>('');

  /* fonctionalité du scan optimisée avec validation flexible */
  const handleScan = (decodedText: string) => {
    if (!decodedText || decodedText.length < 5) return;

    const now = Date.now();

    // Debounce plus souple
    if (decodedText === lastScannedCode.current &&
      now - lastScanTime.current < SCANNER_CONFIG.debounceDelay) {
      return;
    }

    lastScanTime.current = now;
    lastScannedCode.current = decodedText;

    console.log('📱 Code scanné:', decodedText);

    // Validation plus flexible
    const isValid = isValidISBN(decodedText);

    if (!isValid) {
      console.log('❌ Code rejeté (format non valide)');
      return;
    }

    // Nettoyer le code
    const cleanCode = decodedText.replace(/[\s-]/g, '');
    console.log('✅ Code valide scanné:', cleanCode);
    setIsbn(cleanCode);

    // Ajouter le code à la liste
    setScannedCodes(prev => {
      if (!prev.includes(cleanCode)) {
        const newCodes = [...prev, cleanCode];
        console.log('📋 Codes scannés:', newCodes);
        setShowCodesList(true);
        return newCodes;
      }
      return prev;
    });

    // Recherche dans la base de données avec plusieurs formats
    const searchStart = performance.now();

    // Essayer plusieurs formats de recherche
    let isbnTrouve = isbnList.find(item => item.isbn.toString() === cleanCode);

    // Si pas trouvé, essayer avec des formats partiels
    if (!isbnTrouve && cleanCode.length >= 10) {
      // Essayer les 10 derniers chiffres
      const last10 = cleanCode.slice(-10);
      isbnTrouve = isbnList.find(item => item.isbn.toString().endsWith(last10));
    }

    // Si pas trouvé, essayer les 13 premiers chiffres
    if (!isbnTrouve && cleanCode.length >= 13) {
      const first13 = cleanCode.slice(0, 13);
      isbnTrouve = isbnList.find(item => item.isbn.toString().startsWith(first13));
    }

    const searchTime = performance.now() - searchStart;
    console.log(`🔍 Recherche BD: ${searchTime.toFixed(1)}ms`);

    if (isbnTrouve) {
      const livre = inventaire.find(item => item.livre_id === isbnTrouve.livre_id);

      if (livre) {
        console.log(`✅ Livre trouvé : ${livre.title}`);
        // Auto-ouvrir le formulaire de vente
        setSupprimer(1);
        setTimeout(() => setFormOpened(true), 100);
      } else {
        console.log(`✅ Code trouvé mais livre non en stock : ${isbnTrouve.isbn}`);
      }
    } else {
      console.log(`❌ Code non trouvé dans la base : ${cleanCode}`);
    }
  };

  const handleError = (errorMessage: string) => {
    console.error('Erreur de scan:', errorMessage);
  };

  // Fonction pour calculer le prix avec réduction (pour un livre individuel - ancienne méthode)
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

  // Nouvelle fonction pour calculer la réduction sur le TOTAL du panier
  const calculerReductionPanier = () => {
    if (!panierApiItems.length) {
      return {
        totalOriginal: 0,
        totalAvecReduction: 0,
        montantReduction: 0,
        itemsAvecReduction: []
      };
    }

    // 1. Calculer le total original du panier
    const totalOriginal = panierApiItems.reduce((sum, item) =>
      sum + ((item.inventaire?.price || 0) * (item.quantity || 1)), 0
    );

    // 2. Si pas de réduction, retourner le total original
    if (valeurReduction === 0) {
      return {
        totalOriginal,
        totalAvecReduction: totalOriginal,
        montantReduction: 0,
        itemsAvecReduction: panierApiItems.map(item => ({
          ...item,
          prixOriginal: (item.inventaire?.price || 0) * (item.quantity || 1),
          reductionAppliquee: 0,
          prixFinal: (item.inventaire?.price || 0) * (item.quantity || 1),
          prixUnitaireFinal: item.inventaire?.price || 0
        }))
      };
    }

    // 3. Calculer la réduction totale
    let montantReduction = 0;
    if (typeReduction === 'euros') {
      montantReduction = Math.min(valeurReduction, totalOriginal); // Ne pas dépasser le total
    } else {
      montantReduction = (totalOriginal * valeurReduction) / 100;
    }

    // 4. Calculer le total après réduction
    const totalAvecReduction = Math.max(0, totalOriginal - montantReduction);

    // 5. Répartir la réduction proportionnellement sur chaque article
    const itemsAvecReduction = panierApiItems.map(item => {
      const prixOriginalItem = (item.inventaire?.price || 0) * (item.quantity || 1);
      const proportionItem = totalOriginal > 0 ? prixOriginalItem / totalOriginal : 0;
      const reductionItem = montantReduction * proportionItem;
      const prixFinalItem = Math.max(0, prixOriginalItem - reductionItem);

      return {
        ...item,
        prixOriginal: prixOriginalItem,
        reductionAppliquee: reductionItem,
        prixFinal: prixFinalItem,
        prixUnitaireFinal: (item.quantity || 1) > 0 ? prixFinalItem / (item.quantity || 1) : 0
      };
    });

    return {
      totalOriginal,
      totalAvecReduction,
      montantReduction,
      itemsAvecReduction
    };
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
  async function getBackCameraDeviceId(): Promise<string | null> {
    // 1) iOS: forcer l’affichage des labels après permission
    try {
      const pre = await navigator.mediaDevices.getUserMedia({ video: true });
      pre.getTracks().forEach(t => t.stop());
    } catch (_) {
      // on continue quand même
    }

    // 2) Ré-énumérer avec labels visibles
    const devices = await navigator.mediaDevices.enumerateDevices();
    const videos = devices.filter(d => d.kind === 'videoinput');

    // 3) Chercher une caméra "arrière" par label (multilingue)
    const back = videos.find(d => /back|rear|environment|arrière|tras|뒤|後|spate|hinten|后置/i.test(d.label || ''));

    // 4) Fallback: si rien trouvé, prendre la dernière (souvent arrière)
    return back?.deviceId ?? videos[videos.length - 1]?.deviceId ?? null;
  }
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
                  facingMode: "environment",
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
        const initNormalScanner = async () => {
          // Essayer d'abord l'accès forcé à la caméra sur Android
          await forceCameraAccessAndroid();

          if (scannerType === 'html5') {
            // ANDROID/DESKTOP : html5-qrcode optimisé pour détection
            const html5QrcodeScanner = new Html5QrcodeScanner(
              "reader",
              {
                fps: SCANNER_CONFIG.fps,
                aspectRatio: 1.0,
                qrbox: { width: 300, height: 300 },
                videoConstraints: {
                  facingMode: "environment",
                  width: { ideal: 640, max: 1280 },
                  height: { ideal: 480, max: 720 }
                },
                experimentalFeatures: {
                  useBarCodeDetectorIfSupported: true
                },
                showTorchButtonIfSupported: true,
                showZoomSliderIfSupported: true,
                defaultZoomValueIfSupported: 2,
                rememberLastUsedCamera: true,
                useBarCodeDetectorIfSupported: true,
              },
              true
            );

            html5QrcodeScanner.render(
              handleScan,
              (error) => {
                console.error('Erreur de scan HTML5:', error);
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
            // IOS : QuaggaJS optimisé pour détection avec caméra arrière
            console.log('🚀 Initialisation QuaggaJS pour iOS...');

            try {
              // Étape 1: si les labels sont vides, demander un flux générique pour débloquer les permissions iOS
              // Utiliser la fonction utilitaire pour récupérer la back cam si souhaitée
              const deviceId = preferBack ? (await getBackCameraDeviceId()) : null;
              console.log('📷 Caméra sélectionnée (deviceId):', deviceId || 'fallback');



              const supported = navigator.mediaDevices.getSupportedConstraints?.() || {};
              console.log('supported constraints:', supported);

              // Construire des contraintes robustes (sans frameRate ni exact sur facingMode)
              const constraints: MediaTrackConstraints = deviceId
                ? { deviceId: { exact: deviceId }, width: { ideal: 640 }, height: { ideal: 480 } }
                : { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } };

              Quagga.init({
                inputStream: {
                  name: "Live",
                  type: "LiveStream",
                  target: document.getElementById('reader') as HTMLElement,
                  constraints: constraints,
                  area: {
                    top: "10%",
                    right: "10%",
                    left: "10%",
                    bottom: "10%"
                  }
                },
                decoder: {
                  readers: [
                    "ean_reader",
                    "ean_8_reader",
                    "code_128_reader",
                    "code_39_reader",
                    "codabar_reader"
                  ]
                },
                locate: true,
                locator: {
                  patchSize: "medium",
                  halfSample: true
                },
                numOfWorkers: SCANNER_CONFIG.workers,
                frequency: SCANNER_CONFIG.frequency,
                debug: true
              }, (err: Error | null) => {
                if (err) {
                  console.error('❌ Erreur QuaggaJS:', err);
                  handleError(err.message);
                  return;
                }
                console.log("✅ QuaggaJS initialisé avec caméra arrière");
                Quagga.start();
                setScanner(true);
              });

              const onDetected = (result: QuaggaJSResultObject) => {
                const code = result.codeResult.code;
                const confidence = result.codeResult.format;

                console.log('📱 Code détecté par Quagga:', code, 'Format:', confidence);

                if (code && code.length >= 5) {
                  handleScan(code);
                } else {
                  console.log('❌ Code ignoré (trop court):', code);
                }
              };

              Quagga.onDetected(onDetected);

              return () => {
                console.log('Nettoyage QuaggaJS...');
                Quagga.offDetected(onDetected as QuaggaJSResultCallbackFunction);
                Quagga.stop();
                setScanner(null);
              };

            } catch (error) {
              console.error('❌ Erreur énumération caméras iOS:', error);

              // Fallback classique si l'énumération échoue
              Quagga.init({
                inputStream: {
                  name: "Live",
                  type: "LiveStream",
                  target: document.getElementById('reader') as HTMLElement,
                  constraints: {
                    facingMode: 'environment',
                    width: { ideal: 640 },
                    height: { ideal: 480 }
                  }
                },
                decoder: {
                  readers: ["ean_reader", "ean_8_reader", "code_128_reader"]
                },
                locate: true,
                numOfWorkers: SCANNER_CONFIG.workers,
                frequency: SCANNER_CONFIG.frequency
              }, (err: Error | null) => {
                if (err) {
                  handleError(err.message);
                  return;
                }
                Quagga.start();
                setScanner(true);
              });

              const onDetected = (result: QuaggaJSResultObject) => {
                const code = result.codeResult.code;
                if (code && code.length >= 5) {
                  handleScan(code);
                }
              };
              Quagga.onDetected(onDetected);
            }
          }
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

  // Charger le panier API à l'ouverture du modal Panier
  useEffect(() => {
    if (panierOpened && user) {
      fetchPanierApi();
    }
  }, [panierOpened]);

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
    const livre = inventaire.find(item => String(item.isbn || '') === isbn.trim());
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
      setFormOpened(false);
      setSupprimer(1);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('Erreur:', message);
      alert('Erreur lors de la décrémentation');
    }
  };

  const ajouterCommande = async (livre: InventaireItem, quantite: number, prixFinal?: number, transactionInfo?: {
    transaction_id: string;
    prix_original_unitaire: number;
    reduction_appliquee: number;
    type_reduction: 'euros' | 'pourcentage';
    valeur_reduction: number;
    total_transaction_original: number;
    total_transaction_final: number;
  }) => {
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
          prix_final: prixFinal || (livre.price * quantite),
          transactionInfo: transactionInfo || undefined // <-- tout l'objet groupé ici
        }),
      });

      if (!res.ok) throw new Error("Erreur lors de l'ajout de la commande");

      const response = await fetch('/api/inventaire', { method: 'GET' });
      const result = await response.json();
      setInventaire(result.data || []);
      setFormOpened(false);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      console.error('Erreur:', message);
      alert("Erreur lors de l'ajout de la commande");
    }
  };

  const validateAllScannedCodes = async () => {
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

    // Si on a trouvé un ISBN, chercher le livre correspondant localement
    if (isbnTrouve) {
      console.log(`🔎 Recherche du livre pour l'ISBN: ${isbnTrouve.isbn}`);
      const livre = inventaire.find(item => item.livre_id === isbnTrouve.livre_id);

      if (livre) {
        console.log(`✅ Livre trouvé localement: ${livre.title}`);
        livreFound = livre;
      } else {
        console.log(`ℹ️ ISBN trouvé mais pas dans l'inventaire chargé; vérification serveur...`);
        try {
          // Essayer lookup par livre_id en privilégiant l'id si disponible
          const lookupRes = await fetch(`/api/inventaire?livre_id=${isbnTrouve.livre_id}`);
          if (lookupRes.ok) {
            const lookupJson = await lookupRes.json();
            if (lookupJson && lookupJson.data) {
              console.log('✅ Livre trouvé via serveur:', lookupJson.data.title || lookupJson.data);
              // Ajouter localement l'entrée à l'inventaire si elle n'existe pas encore
              const serveurLivre = lookupJson.data as InventaireItem;
              setInventaire(prev => {
                try {
                  const exists = prev.some(p => p.livre_id === serveurLivre.livre_id || p.id === serveurLivre.id);
                  if (exists) return prev;
                  return [serveurLivre, ...prev];
                } catch (_) {
                  return prev;
                }
              });
              livreFound = serveurLivre;
            } else {
              console.log('❌ Aucun livre trouvé côté serveur pour ce livre_id');
            }
          } else {
            console.warn('Recherche serveur non OK', lookupRes.status);
          }
        } catch (err) {
          console.error('Erreur lors du lookup serveur:', err);
        }
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
          user_id: user?.id || null,
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
            <Image src="/2940179870227_p0_v1_s600x595.jpg" alt="Livre du frère Zach" style={{ width: '60px', height: '60px', borderRadius: '50%', objectFit: 'cover', boxShadow: '0 4px 8px rgba(0,0,0,0.3)' }} />
          </div>
          <div className={styles.floatingBook} style={{ top: '20%', right: '20%', animationDelay: '1s' }}>
            <Image src="/41--eGipgSL.webp" alt="Livre du frère Zach" style={{ width: '60px', height: '60px', borderRadius: '50%', objectFit: 'cover', boxShadow: '0 4px 8px rgba(0,0,0,0.3)' }} />
          </div>
          <div className={styles.floatingBook} style={{ top: '35%', left: '10%', animationDelay: '2s' }}>
            <Image src="/images.jpeg" alt="Livre du frère Zach" style={{ width: '60px', height: '60px', borderRadius: '50%', objectFit: 'cover', boxShadow: '0 4px 50% rgba(0,0,0,0.3)' }} />
          </div>
          <div className={styles.floatingBook} style={{ top: '45%', right: '15%', animationDelay: '3s' }}>
            <Image src="/2940179870227_p0_v1_s600x595.jpg" alt="Livre du frère Zach" style={{ width: '60px', height: '60px', borderRadius: '50%', objectFit: 'cover', boxShadow: '0 4px 50% rgba(0,0,0,0.3)' }} />
          </div>
          <div className={styles.floatingBook} style={{ top: '15%', left: '50%', animationDelay: '1.5s' }}>
            <Image src="/41--eGipgSL.webp" alt="Livre du frère Zach" style={{ width: '60px', height: '60px', borderRadius: '50%', objectFit: 'cover', boxShadow: '0 4px 50% rgba(0,0,0,0.3)' }} />
          </div>
          <div className={styles.floatingBook} style={{ top: '30%', right: '45%', animationDelay: '2.5s' }}>
            <Image src="/images.jpeg" alt="Livre du frère Zach" style={{ width: '60px', height: '60px', borderRadius: '50%', objectFit: 'cover', boxShadow: '0 4px 50% rgba(0,0,0,0.3)' }} />
          </div>
          <div className={styles.floatingBook} style={{ top: '50%', left: '25%', animationDelay: '0.5s' }}>
            <Image src="/2940179870227_p0_v1_s600x595.jpg" alt="Livre du frère Zach" style={{ width: '60px', height: '60px', borderRadius: '50%', objectFit: 'cover', boxShadow: '0 4px 50% rgba(0,0,0,0.3)' }} />
          </div>
          <div className={styles.floatingBook} style={{ top: '40%', right: '35%', animationDelay: '3.5s' }}>
            <Image src="/28635380.jpg" alt="Livre du frère Zach" style={{ width: '60px', height: '60px', borderRadius: '50%', objectFit: 'cover', boxShadow: '0 4px 50% rgba(0,0,0,0.3)' }} />
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
      <div className={stylesCommande.productCard} style={{ position: 'fixed', bottom: '0', left: '0', right: '0', top: '350px' }}>
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
              style={{ marginBottom: '0' }}
            >
              <span>🏆</span>
              <div className={stylesCommande.featureIconLabel}>Vendre</div>
            </div>

            <div
              className={stylesCommande.featureIcon}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('🛒 Bouton Panier cliqué !');
                setPanierOpened(true);
              }}
              style={{ marginBottom: '0', position: 'relative' }}
            >
              <span>🛒</span>
              <div className={stylesCommande.featureIconLabel}>Panier</div>
              {panierApiItems.length > 0 && (
                <div style={{
                  position: 'absolute',
                  top: '-5px',
                  right: '-5px',
                  backgroundColor: '#ff4444',
                  color: 'white',
                  borderRadius: '50%',
                  width: '20px',
                  height: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: 'bold'
                }}>
                  {panierApiItems.length}
                </div>
              )}
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
      {/* Scanner en DIV plein écran */}
      {scannerOpened && (
        <div className={styles.scannerFullScreen}>
          <style jsx>{`
              @keyframes pulse {
                0% { opacity: 1; }
                50% { opacity: 0.5; }
                100% { opacity: 1; }
              }
            `}</style>
          {/* Header avec bouton fermer + bouton caméra arrière */}
          <div className={styles.scannerHeader}>
            <div onClick={() => setScannerOpened(false)} className={styles.scannerCloseButton} style={{ marginTop: '100px' }}>
              ✕ Fermer
            </div>
            <div style={{ position: 'absolute', top: '20px', right: '20px', display: 'flex', gap: '8px' }}>
              <Button size="xs" variant={preferBack ? 'filled' : 'outline'} color="blue"
                onClick={() => {
                  setPreferBack(prev => !prev);
                  console.log('🎯 Préférence caméra arrière:', !preferBack);
                  // relancer le scanner pour appliquer la préférence
                  setScannerOpened(false);
                  setTimeout(() => setScannerOpened(true), 50);
                }}>
                {preferBack ? '📷 Arrière ON' : '📷 Arrière OFF'}
              </Button>
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

            {/* Indicateur de scan pour aider l'utilisateur */}
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '250px',
              height: '150px',
              border: '3px solid #00ff00',
              borderRadius: '10px',
              zIndex: 1000,
              pointerEvents: 'none',
              animation: 'pulse 2s infinite'
            }}>
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                color: '#00ff00',
                fontSize: '14px',
                fontWeight: 'bold',
                textAlign: 'center',
                backgroundColor: 'rgba(0,0,0,0.7)',
                padding: '5px 10px',
                borderRadius: '5px'
              }}>
                📱 Pointez vers le code-barres
              </div>
            </div>

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
          const livre = inventaire.find(item => String(item.isbn || '') === isbn.trim());
          if (livre) {
            return (
              <div
                className={isMobile ? styles.iosModalContent : ''}
                style={{ width: 400, maxWidth: '80vw', margin: '0 auto', height: '100%' }}
              >
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
                <Input.Wrapper label="Quantité en stock" mb="md">
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'end' }}>
                    <TextInput
                      value={livre.quantite}
                      readOnly
                      classNames={isMobile ? { input: styles.iosModalInput } : undefined}
                      style={{ flex: 1 }}
                    />
                    
                    <Button
                      size="sm"
                      color="green"
                      onClick={() => {
                        setSelectedLivreForStock(livre);
                        setStockAdded(false);
                        setShowQuantitySelection(false);
                        setAddStockModalOpened(true);
                      }}
                      leftSection="➕"
                    >
                      Rajouter au stock
                    </Button>
                  </div>
                </Input.Wrapper>
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
                    onClick={() => {
                      ajouterAuPanier(livre, supprimer);
                      setInventaire(prev =>
                        prev.map(item => {
                          if (item.id === livre.id) {
                            const nouvelleQuantite = Math.max(0, (item.quantite || 0) - (supprimer || 1));
                            return { ...item, quantite: nouvelleQuantite };
                          }
                          return item;
                        })
                      );

                      // Réajuster la quantité à retirer si elle dépasse le nouveau stock
                      if (supprimer > Math.max(0, (livre.quantite || 0) - (supprimer || 1))) {
                        setSupprimer(1);
                      }

                      setFormOpened(false);
                      setPanierOpened(true);
                    }}
                  >
                    A.panier
                  </Button>

                  <Button style={{ marginLeft: '8px' }} onClick={() => reserverLivre(livre)}>
                    Réserver
                  </Button>
                </Center>
              </div>
            );
          }
          return null;
        })()}

      </Modal>

      <Modal opened={detailOpened} onClose={() => setDetailOpened(false)} title="Détails du livre" centered size="xs">
        {selectedLivre && (
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {/* Image du livre */}
            <div style={{ marginBottom: '15px' }}>
              {selectedLivre.livre?.image ? (
                <Image
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
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '15px', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Text size="sm">Quantité:</Text>
                <input
                  type="number"
                  min={1}
                  value={quantitePanier}
                  onChange={(e) => setQuantitePanier(Math.max(1, Number(e.target.value) || 1))}
                  style={{ width: '70px', padding: '6px 8px', borderRadius: 6, border: '1px solid #ddd' }}
                />
              </div>
              <div>
                <Center>
                  <Button
                    size="m"
                    color="blue"
                    onClick={() => {
                      setDetailOpened(false);
                      setPanierOpened(true);
                      ajouterAuPanier(selectedLivre, quantitePanier);
                    }}
                  >
                    panier
                  </Button>
                  <Button onClick={() => {
                    reserverLivre(selectedLivre);
                  }}>Reserver</Button>
                </Center>
              </div>
            </div>
          </div>
        )}
      </Modal>
      <Modal
        opened={panierOpened}
        onClose={() => setPanierOpened(false)}
        title={`📋 Panier (${panierApiItems.length})`}
        centered
        size="xl"
      >
        {panierApiLoading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <Text size="sm" c="dimmed">Chargement du panier...</Text>
          </div>
        ) : panierApiItems.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <Text size="lg" c="dimmed" mb="md">
              🛒 Votre panier est vide
            </Text>
            <Text size="sm" c="dimmed">
              Ajoutez des livres en cliquant sur &quot;ajouter au panier&quot;
            </Text>
          </div>
        ) : (
          <>
            {/* Liste des livres dans le panier */}
            <div style={{ maxHeight: '400px', overflowY: 'auto', marginBottom: '20px' }}>
              {panierApiItems.map((item, index) => (
                <div
                  key={`${item.id}-${index}`}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '15px',
                    border: '1px solid #e0e0e0',
                    borderRadius: '8px',
                    marginBottom: '10px',
                    backgroundColor: '#f8f9fa'
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <Text size="md" fw={600} mb="xs">
                      📚 {item.livre?.title || 'Titre inconnu'}
                    </Text>
                    <Text size="sm" c="dimmed" mb="xs">
                      👤 {item.livre?.author || 'Auteur inconnu'}
                    </Text>
                    <Text size="sm" c="blue">
                      📖 ISBN: {item.livre?.isbn ?? 'N/A'} | 💰 {item.inventaire?.price ?? 'N/A'}€
                    </Text>
                  </div>
                  <div>
                    <Text size="sm" fw={600}>x{item.quantity}</Text>
                    <Button onClick={() => supprimerDuPanier(item.id)} style={{ marginLeft: '10px' }}>Supprimer</Button>
                  </div>
                </div>
              ))}

            </div>

            {/* Résumé du panier */}
            <div style={{
              backgroundColor: '#e3f2fd',
              padding: '15px',
              borderRadius: '8px',
              marginBottom: '20px'
            }}>
              <Text size="lg" fw={600} mb="sm">
                📊 Résumé du panier
              </Text>
              <Text size="md" mb="xs">
                📚 Nombre de lignes: {panierApiItems.length}
              </Text>
              <Text size="md" fw={600} c="green">
                💰 Total: {panierApiItems.reduce((total, item) => total + (item.inventaire?.price || 0) * (item.quantity || 1), 0).toFixed(2)}€
              </Text>
            </div>

            {/* Boutons d'action */}
            <div style={{}}>
              <Center>
                <Button
                  color="red"
                  variant="outline"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('🏆 Bouton Ajouté cliqué !');
                    setVenteOpened(true);
                    if (selectedLivre) {
                      ajouterAuPanier(selectedLivre);
                    }
                  }}>
                  A.Manuel
                </Button>
                <Button color="green" onClick={() => {
                  // Fermer la modale du panier et ouvrir la confirmation de réduction
                  setPanierOpened(false);
                  setConfirmReductionOpened(true);
                }} style={{ marginLeft: '10px' }}>
                  Vendre
                </Button>
                <Button style={{ marginLeft: '10px' }} onClick={() => { setScannerOpened(true); setPanierOpened(false); setVenteOpened(false); setFormOpened(false) }}>Scanner</Button>
              </Center>
            </div>
          </>
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
      <Modal  opened={listeCommandeOpened}  onClose={() => setListeCommandeOpened(false)} title="📚 Liste des livres disponibles à la vente" centered  size="xl">
        {/*bar de recherche */}
        <div style={{ marginBottom: '20px' }}>
          <TextInput placeholder="🔍 Rechercher un livre par titre, auteur ou ISBN..."  value={search} onChange={(e) => { setSearch(e.currentTarget.value); setPage(1); }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === 'Escape') {
                e.currentTarget.blur(); // Désactive le clavier
                (document.activeElement as HTMLElement)?.blur(); // Force la désactivation du focus
              }
            }} style={{ marginBottom: '15px' }} styles={{input: { borderRadius: '10px',  border: '2px solid #e0e0e0', fontSize: '16px', transform: 'scale(1)',   touchAction: 'manipulation'} }} inputMode="search"  autoComplete="off" 
          />
        </div>
        <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
          {inventaire.length === 0 ? ( <Text c="dimmed" ta="center" py="xl"> Aucun livre en stock </Text>): 
          (
            <div className={stylesCommande.transactionsList}>  {inventaire.filter(item =>
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
                      <Image src={item.livre.image} alt="Livre" style={{ width: '30px', height: '30px' }} />
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
          <Text size="sm" c="dimmed">💡 Cliquez sur un livre pour voir ses détails et le vendre </Text>
        </div>
      </Modal>
      {/* Modale de vente - Liste des livres pour vente */}
      <Modal  opened={venteOpened} onClose={() => setVenteOpened(false)} title="📚 Liste des livres disponibles à la vente" centered  size="xl">
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
          {livresLoading ? (
            <Text c="dimmed" ta="center" py="xl">Chargement...</Text>
          ) : livres.length === 0 ? (
            <Text c="dimmed" ta="center" py="xl">Aucun livre en stock</Text>
          ) : (
            <div className={stylesCommande.transactionsList}>
              {livres.filter(item =>
                item.title.toLowerCase().includes(search.toLowerCase()) ||
                item.author.toLowerCase().includes(search.toLowerCase()) ||
                String(item.isbn || '').includes(search)
              ).map((item) => (
                <div key={item.id} onClick={() => {
                  detailvre(String(item.isbn || ''));
                  setVenteOpened(false);
                }} className={stylesCommande.transaction}>
                  <div className={stylesCommande.transactionIcon}>
                    {item.livre?.image ?
                      <Image src={item.livre.image} alt="Livre" style={{ width: '30px', height: '30px' }} />
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

        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 12 }}>
          <Pagination value={page} onChange={setPage} total={totalPages} siblings={2} boundaries={1} />
        </div>

        <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
          <Text size="sm" c="dimmed">💡 Cliquez sur un livre pour voir ses détails et le vendre</Text>
        </div>
      </Modal>

      {/* Modale de confirmation de réduction */}
      <Modal
        opened={confirmReductionOpened}
        onClose={() => setConfirmReductionOpened(false)}
        title="🏷️ Appliquer une réduction ?"
        centered
        size="sm"
      >
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <Text size="lg" fw={600} mb="xl">
            Voulez-vous appliquer une réduction à cette vente ?
          </Text>

          <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
            <Button
              size="lg"
              color="green"
              variant="filled"
              onClick={() => {
                setConfirmReductionOpened(false);
                if (panierApiItems.length > 0) {
                  setModeModal('vente');
                  setLivreEnVente(panierApiItems[0]?.livre ? {
                    id: panierApiItems[0].livre.id,
                    livre_id: panierApiItems[0].livre.id,
                    title: panierApiItems[0].livre.title,
                    author: panierApiItems[0].livre.author,
                    quantite: 1,
                    price: panierApiItems[0].inventaire?.price || 0,
                    isbn: panierApiItems[0].livre.isbn
                  } : null);
                  setQuantiteVente(panierApiItems.length);
                  setValeurReduction(0);
                  setTypeReduction('euros');
                  setReductionOpened(true);
                } else {
                  // Vente individuelle avec réduction - ouvrir d'abord la liste des livres
                  setVenteOpened(true);
                }
              }}
              style={{ flex: 1 }}
            >
              ✅ Oui, avec réduction
            </Button>

            <Button
              size="lg"
              color="blue"
              variant="outline"
              onClick={() => {
                // Fermer la confirmation
                setConfirmReductionOpened(false);

                // Si le panier contient des articles, vendre directement sans réduction
                if (panierApiItems.length > 0) {
                  // S'assurer qu'aucune réduction n'est appliquée pour cette vente
                  setValeurReduction(0);
                  setTypeReduction('euros');
                  // Lancer la validation du panier (vente)
                  validerVentePanier();
                } else {
                  // Sinon, ouvrir la liste des livres pour vente individuelle
                  setVenteOpened(true);
                }
              }}
              style={{ flex: 1 }}>
              💰 Non, vendre directement
            </Button>
          </div>

          <Text size="sm" c="dimmed" mt="md" style={{ fontStyle: 'italic' }}>
            💡 {panierApiItems.length > 0
              ? `Panier contient ${panierApiItems.length} article(s)`
              : 'Vous pourrez sélectionner les livres à vendre dans l\'étape suivante'
            }
          </Text>
        </div>
      </Modal>
      {/* Modale de réduction */}
      <Modal opened={reductionOpened} onClose={() => setReductionOpened(false)} title={modeModal === 'reservation' ? "📅 Réserver des livres" : "💰 Appliquer une réduction"} centered size="sm">
        {livreEnVente && (
          <div style={{ padding: '10px' }}>
            {/* Résumé de la vente */}
            <div style={{
              backgroundColor: '#f8f9fa',
              padding: '15px',
              borderRadius: '8px',
              marginBottom: '20px'
            }}>
              {modeModal === 'vente' && panierApiItems.length > 0 ? (
                <>
                  <Text size="sm" fw={600} mb="xs">🛒 Vente du panier ({panierApiItems.length} article{panierApiItems.length > 1 ? 's' : ''})</Text>
                  <div style={{ maxHeight: '150px', overflowY: 'auto', marginBottom: '10px' }}>
                    {panierApiItems.map((item, index) => (
                      <div key={index} style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        padding: '5px 0',
                        borderBottom: index < panierApiItems.length - 1 ? '1px solid #e0e0e0' : 'none'
                      }}>
                        <Text size="xs" c="dimmed">{item.livre?.title || 'Titre inconnu'} x{item.quantity}</Text>
                        <Text size="xs" c="blue">{((item.inventaire?.price || 0) * (item.quantity || 1)).toFixed(2)}€</Text>
                      </div>
                    ))}
                  </div>
                  <Text size="sm" fw={600}>
                    💰 Total: {panierApiItems.reduce((total, item) => total + (item.inventaire?.price || 0) * (item.quantity || 1), 0).toFixed(2)}€
                  </Text>
                </>
              ) : (
                <>
                  <Text size="sm" fw={600} mb="xs">📚 {livreEnVente.title}</Text>
                  <Text size="sm" c="dimmed" mb="xs">Quantité: {quantiteVente}x</Text>
                  <Text size="sm" c="dimmed" mb="xs">Prix unitaire: {livreEnVente.price}€</Text>
                  <Text size="sm" fw={600}>
                    Prix total: {(livreEnVente.price * quantiteVente).toFixed(2)}€
                  </Text>
                </>
              )}
            </div>

            {/* Sélection de la quantité */}
            {modeModal === 'vente' && panierApiItems.length > 0 ? (
              <div style={{
                backgroundColor: '#e3f2fd',
                padding: '10px',
                borderRadius: '6px',
                marginBottom: '20px'
              }}>
                <Text size="sm" c="blue" fw={600}>
                  📚 Quantité fixe: {panierApiItems.reduce((total, item) => total + (item.quantity || 1), 0)} article{panierApiItems.reduce((total, item) => total + (item.quantity || 1), 0) > 1 ? 's' : ''} (panier)
                </Text>
              </div>
            ) : (
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
            )}

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
                  max={typeReduction === 'pourcentage' ? 100 : (modeModal === 'vente' && panierApiItems.length > 0 ?
                    panierApiItems.reduce((total, item) => total + ((item.inventaire?.price || 0) * (item.quantity || 1)), 0) :
                    livreEnVente.price * quantiteVente)}
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
                <Text size="sm" c="dimmed" mb="xs">Quantité à bloquer: {quantiteVente} exemplaires</Text>
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
                <Text size="sm" c="dimmed">
                  Prix original: {modeModal === 'vente' && panierApiItems.length > 0 ?
                    (() => {
                      const resultats = calculerReductionPanier();
                      return resultats.totalOriginal.toFixed(2);
                    })() :
                    (livreEnVente.price * quantiteVente).toFixed(2)}€
                </Text>
                {valeurReduction > 0 && (
                  <Text size="sm" c="red">
                    Réduction: -{typeReduction === 'euros'
                      ? `${valeurReduction.toFixed(2)}€`
                      : `${valeurReduction}% (${modeModal === 'vente' && panierApiItems.length > 0 ?
                        (() => {
                          const resultats = calculerReductionPanier();
                          return resultats.montantReduction.toFixed(2);
                        })() :
                        ((livreEnVente.price * quantiteVente * valeurReduction) / 100).toFixed(2)}€)`
                    }
                  </Text>
                )}
                <Text size="lg" fw={700} c="green">
                  💰 Prix final: {modeModal === 'vente' && panierApiItems.length > 0 ?
                    (() => {
                      const resultats = calculerReductionPanier();
                      return resultats.totalAvecReduction.toFixed(2);
                    })() :
                    calculerPrixAvecReduction(livreEnVente.price, quantiteVente).toFixed(2)}€
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
                color={modeModal === 'reservation' ? 'orange' : (livreEnVente && livreEnVente.quantite <= 0) ? 'blue' : 'green'}
                disabled={modeModal === 'vente' ? (() => {
                  if (modeModal === 'vente' && panierApiItems.length > 0) {
                    // Vérifier que tous les livres du panier sont disponibles
                    for (const item of panierApiItems) {
                      const livre = inventaire.find(inv => inv.livre_id === item.livre?.id);
                      if (!livre) continue; // Ignorer si livre non trouvé (peut être vendu)
                      // Si quantité <= 0, permettre la vente (redirection vers ajout de stock)
                      if (livre.quantite > 0) {
                        const quantiteReservee = livre.quantite_reservee || 0;
                        const quantiteDisponible = livre.quantite - quantiteReservee;
                        if (quantiteDisponible < (item.quantity || 1)) return true; // Désactiver si stock insuffisant
                      }
                    }
                    return false; // Permettre la vente si tous les livres sont OK ou à 0 stock
                  }
                  // Pour vente individuelle
                  if (!livreEnVente) return true;
                  if (livreEnVente.quantite <= 0) return false; // Permettre (redirection vers ajout de stock)
                  const quantiteReservee = livreEnVente.quantite_reservee || 0;
                  const quantiteDisponible = livreEnVente.quantite - quantiteReservee;
                  if (quantiteDisponible <= 0) return true; // Désactiver si tout est réservé
                  if (quantiteVente > quantiteDisponible) return true; // Désactiver si quantité demandée > disponible
                  return false; // Permettre la vente
                })() : false}
                onClick={async () => {
                  if (modeModal === 'vente' && panierApiItems.length > 0) {
                    // Mode vente du panier : utiliser la fonction validerVentePanier
                    await validerVentePanier();
                    setReductionOpened(false);
                    setLivreEnVente(null);
                    setValeurReduction(0);
                  } else if (livreEnVente) {
                    if (modeModal === 'reservation') {
                      // Mode réservation : bloquer le stock
                      if (!dateReservation) {
                        alert('❌ Veuillez sélectionner une date d\'expiration');
                        return;
                      }
                      await reserverLivresInventaire(livreEnVente, quantiteVente, dateReservation);
                    } else {
                      // Si le livre est à 0 en stock, rediriger vers ScannerResception avec les infos du livre
                      if (livreEnVente.quantite <= 0) {
                        alert('📦 Livre épuisé ! Redirection vers la page d\'ajout de stock...');
                        setReductionOpened(false);
                        setLivreEnVente(null);
                        setValeurReduction(0);

                        // Passer les informations du livre à ScannerResception (comme lignes 1004-1008)
                        localStorage.setItem('autoOpenForm', 'true');
                        localStorage.setItem('returnToCommande', 'true');
                        localStorage.setItem('scannedIsbns', JSON.stringify([livreEnVente.isbn.toString()]));
                        window.location.href = '/inventaire/ScannerResception';
                        return;
                      }

                      // Mode vente : procéder à la vente
                      const prixFinal = calculerPrixAvecReduction(livreEnVente.price, quantiteVente);
                      const prixOriginal = livreEnVente.price * quantiteVente;

                      // Préparer les informations de transaction pour vente individuelle
                      const transactionInfo = valeurReduction > 0 ? {
                        transaction_id: `TXN_${Date.now()}_${user?.id ?? 'unknown'}_INDIVIDUAL`,
                        prix_original_unitaire: livreEnVente.price,
                        reduction_appliquee: prixOriginal - prixFinal,
                        type_reduction: typeReduction,
                        valeur_reduction: valeurReduction,
                        total_transaction_original: prixOriginal,
                        total_transaction_final: prixFinal
                      } : undefined;

                      await decrementInventaire(livreEnVente, quantiteVente);
                      await ajouterCommande(livreEnVente, quantiteVente, prixFinal / quantiteVente, transactionInfo);

                      if (valeurReduction > 0) {
                        const economie = prixOriginal - prixFinal;
                        alert(`✅ Vente effectuée !\n💰 Prix final: ${prixFinal.toFixed(2)}€\n🎉 Économie: ${economie.toFixed(2)}€${transactionInfo ? `\n🆔 Transaction: ${transactionInfo.transaction_id}` : ''}`);
                      } else {
                        alert(`✅ Vente effectuée pour ${prixFinal.toFixed(2)}€`);
                      }

                      setReductionOpened(false);
                      setLivreEnVente(null);
                      setValeurReduction(0);
                    }
                  }
                }}
                title={modeModal === 'vente' && panierApiItems.length > 0 ?
                  "✅ Vendre tous les livres du panier" :
                  modeModal === 'vente' && livreEnVente ? (() => {
                    if (livreEnVente.quantite <= 0) return "📦 Ajouter ce livre au stock";

                    const quantiteReservee = livreEnVente.quantite_reservee || 0;
                    const quantiteDisponible = livreEnVente.quantite - quantiteReservee;

                    if (quantiteDisponible <= 0) return `❌ Tous les exemplaires (${quantiteReservee}) sont réservés`;
                    if (quantiteVente > quantiteDisponible)
                      return `❌ Stock insuffisant !\n📦 Disponible: ${quantiteDisponible}\n🛒 Demandé: ${quantiteVente}`;
                    return "✅Confirmer";
                  })() : undefined}
                style={{ flex: 1 }}
              >
                {modeModal === 'reservation' ? '📅 Confirmer la réservation' :
                  modeModal === 'vente' && panierApiItems.length > 0 ? '🛒 Vendre le panier' :
                    (livreEnVente && livreEnVente.quantite <= 0) ? '📦 Ajouter au stock' : '✅ Confirmer la vente'}
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
                          disabled={(() => {
                            // Trouver le livre correspondant dans l'inventaire
                            const livre = inventaire.find(item => item.id === reservation.inventaire_id);
                            if (!livre) return true; // Désactiver si livre non trouvé

                            // Vérifier si la quantité réservée dépasse le stock
                            if (reservation.quantite_bloquee > livre.quantite) return true;

                            // Vérifier si le livre est en stock
                            if (livre.quantite <= 0) return true;

                            return false; // Activer le bouton sinon
                          })()}
                          title={(() => {
                            const livre = inventaire.find(item => item.id === reservation.inventaire_id);
                            if (!livre) return "Livre non trouvé dans l'inventaire";
                            if (livre.quantite <= 0) return "Livre épuisé";
                            if (reservation.quantite_bloquee > livre.quantite)
                              return `Stock insuffisant (${livre.quantite} disponibles)`;
                            return "Vendre cette réservation";
                          })()}
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

      {/* Modal pour ajouter au stock */}
      <Modal
        opened={addStockModalOpened}
        onClose={() => {
          setAddStockModalOpened(false);
          setStockAdded(false);
          setShowQuantitySelection(false);
        }}
        title="Ajouter au stock"
        centered
        size="sm"
      >
        {selectedLivreForStock && (
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <Text size="lg" fw={600} mb="md">
              📚 {selectedLivreForStock.title}
            </Text>
            <Text size="sm" c="dimmed" mb="lg">
              Stock actuel: {selectedLivreForStock.quantite} exemplaire{selectedLivreForStock.quantite > 1 ? 's' : ''}
            </Text>

            {!stockAdded ? (
              <>
                <Text size="md" fw={500} mb="sm">
                  Sélectionnez la quantité à ajouter
                </Text>

                <NumberInput
                  placeholder="Quantité à ajouter"
                  min={1}
                  max={1000}
                  value={quantiteAjouter}
                  onChange={(value) => setQuantiteAjouter(Number(value) || 1)}
                  style={{ marginBottom: '20px' }}
                  size="md"
                />

                <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setAddStockModalOpened(false);
                      setStockAdded(false);
                      setShowQuantitySelection(false);
                    }}
                    style={{ flex: 1 }}
                  >
                    Annuler
                  </Button>
                  <Button
                    color="green"
                    onClick={async () => {
                      await incrementInventaire(selectedLivreForStock, quantiteAjouter);
                      setStockAdded(true);
                    }}
                    style={{ flex: 1 }}
                    leftSection="➕"
                  >
                    Ajouter {quantiteAjouter}
                  </Button>
                </div>
              </>
            ) : !showQuantitySelection ? (
              <>
                <Text size="md" fw={500} mb="lg">
                  ✅ {quantiteAjouter} exemplaire{quantiteAjouter > 1 ? 's' : ''} ajouté{quantiteAjouter > 1 ? 's' : ''} au stock !
                </Text>

                <Text size="sm" c="dimmed" mb="lg">
                  Voulez-vous ajouter ce livre au panier ?
                </Text>

                <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setAddStockModalOpened(false);
                      setStockAdded(false);
                      setShowQuantitySelection(false);
                      setFormOpened(false);
                    }}
                    style={{ flex: 1 }}
                  >
                    Non, fermer
                  </Button>
                  <Button
                    color="blue"
                    onClick={() => {
                      setShowQuantitySelection(true);
                    }}
                    style={{ flex: 1 }}
                    leftSection="🛒"
                  >
                    Oui, ajouter au panier
                  </Button>
                </div>
              </>
            ) : (
              <>
                <Text size="md" fw={500} mb="sm">
                  Combien de livres voulez-vous ajouter au panier ?
                </Text>
                <Text size="sm" c="dimmed" mb="lg">
                  Stock disponible: {selectedLivreForStock.quantite} exemplaire{selectedLivreForStock.quantite > 1 ? 's' : ''}
                </Text>

                <NumberInput
                  placeholder="Quantité pour le panier"
                  min={1}
                  max={selectedLivreForStock.quantite}
                  value={quantiteAjouter}
                  onChange={(value) => setQuantiteAjouter(Number(value) || 1)}
                  style={{ marginBottom: '20px' }}
                  size="md"
                />

                <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowQuantitySelection(false);
                    }}
                    style={{ flex: 1 }}
                  >
                    Retour
                  </Button>
                  <Button
                    color="blue"
                    onClick={() => {
                      ajouterAuPanier(selectedLivreForStock, quantiteAjouter);
                      setAddStockModalOpened(false);
                      setStockAdded(false);
                      setShowQuantitySelection(false);
                      setFormOpened(false);
                      setPanierOpened(true);
                    }}
                    style={{ flex: 1 }}
                    leftSection="🛒"
                  >
                    Ajouter {quantiteAjouter} au panier
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
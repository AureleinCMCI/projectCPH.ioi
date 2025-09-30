'use client';

import { Badge, Button, Card, Center, Grid, Group, Loader, Modal, Paper, ScrollArea, Select, Stack, Table, Text } from '@mantine/core';
import { IconCurrencyEuro, IconDownload, IconPackage, IconShoppingCart, IconTrendingDown, IconTrendingUp, IconUsers, IconX } from '@tabler/icons-react';
import React, { useEffect, useRef, useState } from 'react';
import styles from './style/statistique.module.css';

type StatsGlobales = {
  totalVentes: number;
  totalReceptions: number;
  totalReservations: number;
  totalMontant: number;
  totalLivres: number;
  evolutionVentes: number;
  evolutionReceptions: number;
  ventesMoisActuel: number;
  chiffreAffairesMoisActuel: number;
  receptionsMoisActuel: number;
};

type Commande = {
  date_achat: string;
  quantite: number;
  title: string;
  price?: number; // Prix réel de vente (avec réductions)
  vendeur?: string; // Nom du vendeur
};

type Reception = {
  id?: number;
  user_id: number;
  date_reception: number;
  quantite: number;
  livre_id: number;
  info: number;
  name_user: string;
  livre_title: string;
};

type Reservation = {
  id: number;
  inventaire_id: number;
  quantite_bloquee: number;
  date_expiration: string;
  date_creation: string;
   name?: string;
    telephone?: string;
  inventaire?: {
    title: string;
    author: string;
    price: number;
    isbn: number;
  };
};

type InventaireItem = {
  title: string;
  price: number;
  quantite: number;
};

// Composant pour animer les compteurs
function AnimatedCounter({ value, duration = 1000, formatFn }: { 
  value: number; 
  duration?: number; 
  formatFn?: (num: number) => string;
}) {
  const [displayValue, setDisplayValue] = useState(0);
  const [previousValue, setPreviousValue] = useState(0);
  const countRef = useRef<number | null>(null);

  useEffect(() => {
    if (previousValue !== value) {
      // Annuler l'animation précédente si elle existe
      if (countRef.current !== null) {
        cancelAnimationFrame(countRef.current);
      }

      const startValue = previousValue;
      const endValue = value;
      const startTime = Date.now();

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Fonction d'easing pour un effet plus smooth
        const easeOutQuart = 1 - Math.pow(1 - progress, 4);
        
        const currentValue = startValue + (endValue - startValue) * easeOutQuart;
        setDisplayValue(Math.round(currentValue));

        if (progress < 1) {
          countRef.current = requestAnimationFrame(animate);
        } else {
          setPreviousValue(value);
          countRef.current = null;
        }
      };

      countRef.current = requestAnimationFrame(animate);
    }

    return () => {
      if (countRef.current !== null) {
        cancelAnimationFrame(countRef.current);
      }
    };
  }, [value, duration, previousValue]);

  // Utiliser la fonction de formatage si fournie, sinon formatage par défaut
  const formattedValue = formatFn ? formatFn(displayValue) : displayValue.toString();

  return <span>{formattedValue}</span>;
}

export default function Statistique() {
  const [statsGlobales, setStatsGlobales] = useState<StatsGlobales>({
    totalVentes: 0,
    totalReceptions: 0,
    totalReservations: 0,
    totalMontant: 0,
    totalLivres: 0,
    evolutionVentes: 0,
    evolutionReceptions: 0,
    ventesMoisActuel: 0,
    chiffreAffairesMoisActuel: 0,
    receptionsMoisActuel: 0
  });
  const [loading, setLoading] = useState(true);
     const [modalVentesOuvert, setModalVentesOuvert] = useState(false);
   const [modalReceptionsOuvert, setModalReceptionsOuvert] = useState(false);
   const [modalCAOuvert, setModalCAOuvert] = useState(false);
   const [modalStockOuvert, setModalStockOuvert] = useState(false);
   const [modalReservationsOuvert, setModalReservationsOuvert] = useState(false);
  const [toutesLesCommandes, setToutesLesCommandes] = useState<Commande[]>([]);
  const [toutesLesReceptions, setToutesLesReceptions] = useState<Reception[]>([]);
  const [toutesLesReservations, setToutesLesReservations] = useState<Reservation[]>([]);
  const [inventaire, setInventaire] = useState<InventaireItem[]>([]);
  const [moisFiltre, setMoisFiltre] = useState<string>('tous');
  const [moisFiltreReceptions, setMoisFiltreReceptions] = useState<string>('tous');
  const [moisFiltreCA, setMoisFiltreCA] = useState<string>('tous');
  const [detailsOuverts, setDetailsOuverts] = useState<Set<string>>(new Set());

  // Fonction helper pour convertir les timestamps
  const convertirTimestamp = (timestamp: number): Date => {
    console.log('Conversion timestamp:', timestamp);
    
    // Essayer différents formats de timestamp
    let date = new Date(timestamp);
    console.log('Date brute:', date);
    
    // Si la date semble incorrecte (trop ancienne ou invalide), essayer avec *1000
    if (isNaN(date.getTime()) || date.getFullYear() < 2020) {
      console.log('Date invalide, essai avec *1000');
      date = new Date(timestamp * 1000);
      console.log('Date corrigée:', date);
    }
    
    // Si toujours invalide, retourner date actuelle
    if (isNaN(date.getTime())) {
      console.log('Date toujours invalide, utilisation date actuelle');
      date = new Date();
    }
    
    console.log('Date finale:', date.toLocaleDateString('fr-FR'));
    return date;
  };

  // Récupération des statistiques en temps réel
  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Récupérer les commandes (ventes)
        const commandesRes = await fetch('/api/commande');
        const commandes = await commandesRes.json();
        
        // Récupérer l'historique des réceptions
        const receptionsRes = await fetch('/api/historiqueResception');
        const receptions = await receptionsRes.json();
        
        // Récupérer l'inventaire total
        const inventaireRes = await fetch('/api/inventaire');
        const inventaire = await inventaireRes.json();
        
                 // Récupérer toutes les réservations (pour les statistiques globales)
         const reservationsRes = await fetch('/api/reservations');
         const reservations = await reservationsRes.json();
         
         // Calculer les statistiques globales
         const totalVentes = commandes.data?.reduce((acc: number, cmd: Commande) => acc + cmd.quantite, 0) || 0;
         const totalReceptions = receptions.user?.reduce((acc: number, rec: Reception) => acc + rec.quantite, 0) || 0;
         const totalReservations = reservations.data?.reduce((acc: number, res: Reservation) => acc + res.quantite_bloquee, 0) || 0;
        const totalMontant = commandes.data?.reduce((acc: number, cmd: Commande) => {
          // Le prix stocké est déjà le prix total (prix unitaire * quantité)
          if (cmd.price) {
            return acc + cmd.price;
          } else {
            // Fallback : calculer le prix total si pas de prix stocké
            const livre = inventaire.data?.find((item: InventaireItem) => item.title === cmd.title);
            return acc + (livre?.price || 0) * cmd.quantite;
          }
        }, 0) || 0;
        const totalLivres = inventaire.data?.reduce((acc: number, item: InventaireItem) => acc + item.quantite, 0) || 0;
        
        // Calculer les ventes et chiffre d'affaires du mois actuel
        const maintenant = new Date();
        const debutMoisActuel = new Date(maintenant.getFullYear(), maintenant.getMonth(), 1);
        const finMoisActuel = new Date(maintenant.getFullYear(), maintenant.getMonth() + 1, 0);
        
        // Filtrer les commandes du mois actuel
        const commandesMoisActuel = commandes.data?.filter((cmd: Commande) => {
          const dateCommande = new Date(cmd.date_achat);
          return dateCommande >= debutMoisActuel && dateCommande <= finMoisActuel;
        }) || [];
        
        // Calculer les ventes du mois actuel
        const ventesMoisActuel = commandesMoisActuel.reduce((acc: number, cmd: Commande) => acc + cmd.quantite, 0);
        
        // Calculer le chiffre d'affaires du mois actuel
        const chiffreAffairesMoisActuel = commandesMoisActuel.reduce((acc: number, cmd: Commande) => {
          // Le prix stocké est déjà le prix total (prix unitaire * quantité)
          if (cmd.price) {
            return acc + cmd.price;
          } else {
            // Fallback : calculer le prix total si pas de prix stocké
            const livre = inventaire.data?.find((item: InventaireItem) => item.title === cmd.title);
            return acc + (livre?.price || 0) * cmd.quantite;
          }
        }, 0);
        
        // Calculer les réceptions du mois actuel pour comparaison
        const receptionsMoisActuel = receptions.user?.filter((rec: Reception) => {
          const dateReception = convertirTimestamp(rec.date_reception);
          return dateReception >= debutMoisActuel && dateReception <= finMoisActuel;
        }).reduce((acc: number, rec: Reception) => acc + rec.quantite, 0) || 0;
        
                 setStatsGlobales({
           totalVentes,
           totalReceptions,
           totalReservations,
           totalMontant,
           totalLivres,
           evolutionVentes: totalVentes - ventesMoisActuel,
           evolutionReceptions: totalReceptions - receptionsMoisActuel,
           ventesMoisActuel,
           chiffreAffairesMoisActuel,
           receptionsMoisActuel
         });
        
                 // Stocker les données pour les modals
         setToutesLesCommandes(commandes.data || []);
         setToutesLesReceptions(receptions.user || []);
         setToutesLesReservations(reservations.data || []);
         setInventaire(inventaire.data || []);
        
        // Debug logs pour vérifier les données
        console.log('Réceptions récupérées:', receptions.user);
        console.log('Nombre de réceptions:', receptions.user?.length || 0);
        
        // Note: Les données de graphiques peuvent être ajoutées ici si nécessaire
        
      } catch (error) {
        console.error('Erreur lors de la récupération des statistiques:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
    
    // Mettre à jour toutes les 30 secondes pour avoir des stats en direct
    const interval = setInterval(fetchStats, 30000);
    
    return () => clearInterval(interval);
  }, []);



  if (loading) {
    return (
      <div className={styles.revolutStyle}>
        <Center style={{ height: '50vh' }}>
          <Loader size="xl" />
        </Center>
      </div>
    );
  }
  const formatNumber = (num: number): string => {
    // Vérifier que num est bien un nombre
    if (typeof num !== 'number' || isNaN(num)) {
      return '0';
    }
    return num.toLocaleString('fr-FR');
  };

  // Fonction pour filtrer les ventes par mois
  const getVentesFiltrees = () => {
    if (moisFiltre === 'tous') {
      return toutesLesCommandes;
    }
    
    const moisIndex = parseInt(moisFiltre);
    return toutesLesCommandes.filter(cmd => {
      const date = new Date(cmd.date_achat);
      return date.getMonth() === moisIndex;
    });
  };

  // Fonction pour filtrer les réceptions par mois
  const getReceptionsFiltrees = () => {
    console.log('=== DEBUG FILTRE RÉCEPTIONS ===');
    console.log('Filtre actuel:', moisFiltreReceptions);
    console.log('Toutes les réceptions:', toutesLesReceptions);
    console.log('Nombre total de réceptions:', toutesLesReceptions.length);
    
    if (moisFiltreReceptions === 'tous') {
      console.log('Retour de toutes les réceptions');
      return toutesLesReceptions;
    }
    
    const moisIndex = parseInt(moisFiltreReceptions);
    console.log('Index du mois recherché:', moisIndex);
    
    const filtrees = toutesLesReceptions.filter(rec => {
      const date = convertirTimestamp(rec.date_reception);
      const moisRec = date.getMonth();
      console.log(`Réception: timestamp=${rec.date_reception}, date=${date.toLocaleDateString('fr-FR')}, mois=${moisRec}, quantité=${rec.quantite}`);
      return moisRec === moisIndex;
    });
    
    console.log('Réceptions filtrées:', filtrees);
    console.log('Nombre de réceptions filtrées:', filtrees.length);
    console.log('=================================');
    
    return filtrees;
  };

  // Fonction pour filtrer les commandes pour le CA par mois
  const getCommandesCAFiltrees = () => {
    if (moisFiltreCA === 'tous') {
      return toutesLesCommandes;
    }
    
    const moisIndex = parseInt(moisFiltreCA);
    return toutesLesCommandes.filter(cmd => {
      const date = new Date(cmd.date_achat);
      return date.getMonth() === moisIndex;
    });
  };

  // Fonction pour obtenir le prix d'un livre
  const getPrixLivre = (title: string, commande?: Commande): number => {
    // Priorité au prix réel de la commande (avec réduction)
    if (commande?.price && commande.price > 0) {
      return commande.price;
    }
    // Sinon utiliser le prix de l'inventaire
    const livre = inventaire.find(item => item.title === title);
    return livre?.price || 0;
  };

  // Fonction pour obtenir le prix original (sans réduction)
  const getPrixOriginal = (title: string, quantite: number): number => {
    const livre = inventaire.find(item => item.title === title);
    return (livre?.price || 0) * quantite;
  };

  // Fonction pour grouper les commandes par transaction (même vendeur, même date, même heure)
  const grouperCommandesParTransaction = (commandes: Commande[]) => {
    const groupes = new Map<string, Commande[]>();
    
    commandes.forEach(commande => {
      // Créer une clé unique basée sur vendeur + date + heure (arrondie à la minute)
      const date = new Date(commande.date_achat);
      const dateCle = date.toISOString().slice(0, 16); // YYYY-MM-DDTHH:MM
      const cle = `${commande.vendeur || 'inconnu'}_${dateCle}`;
      
      if (!groupes.has(cle)) {
        groupes.set(cle, []);
      }
      groupes.get(cle)!.push(commande);
    });
    
    return Array.from(groupes.entries()).map(([cle, commandes]) => {
      const premiereCommande = commandes[0];
      const date = new Date(premiereCommande.date_achat);
      
      return {
        cle,
        date: date.toDateString(),
        vendeur: premiereCommande.vendeur || 'Inconnu',
        commandes: commandes.sort((a, b) => a.title.localeCompare(b.title))
      };
    });
  };

  // Fonction pour basculer l'affichage des détails
  const basculerDetails = (cle: string) => {
    const nouveauxDetails = new Set(detailsOuverts);
    if (nouveauxDetails.has(cle)) {
      nouveauxDetails.delete(cle);
    } else {
      nouveauxDetails.add(cle);
    }
    setDetailsOuverts(nouveauxDetails);
  };

  // Options pour le filtre des mois
  const optionsMois = [
    { value: 'tous', label: 'Tous les mois' },
    { value: '0', label: 'Janvier' },
    { value: '1', label: 'Février' },
    { value: '2', label: 'Mars' },
    { value: '3', label: 'Avril' },
    { value: '4', label: 'Mai' },
    { value: '5', label: 'Juin' },
    { value: '6', label: 'Juillet' },
    { value: '7', label: 'Août' },
    { value: '8', label: 'Septembre' },
    { value: '9', label: 'Octobre' },
    { value: '10', label: 'Novembre' },
    { value: '11', label: 'Décembre' }
  ];

  // Fonction pour télécharger les données en CSV
  const telechargerCSV = () => {
    try {
      const ventesFiltrees = getVentesFiltrees();
      
      // Log pour debug
      console.log('Filtre actuel:', moisFiltre);
      console.log('Nombre de ventes filtrées:', ventesFiltrees.length);
      console.log('Ventes filtrées:', ventesFiltrees);
      
      if (ventesFiltrees.length === 0) {
        alert('Aucune vente à exporter pour cette période.');
        return;
      }

      // Message de confirmation
      const moisOption = optionsMois.find(m => m.value === moisFiltre);
      const nomMois = moisFiltre === 'tous' ? 'tous les mois' : moisOption?.label || 'mois inconnu';
      const confirmation = `Téléchargement de ${ventesFiltrees.length} vente(s) pour ${nomMois}`;
      console.log(confirmation);

      // En-têtes CSV
      const entetes = ['Date', 'Livres vendus', 'Quantité totale', 'Prix original (€)', 'Prix avec réduction (€)', 'Économie (€)'];
      
      // Données CSV groupées par transaction
      const donneesCSV = grouperCommandesParTransaction(ventesFiltrees)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .map(groupe => {
          const date = new Date(groupe.date);
          const quantiteTotale = groupe.commandes.reduce((acc, cmd) => acc + cmd.quantite, 0);
          const prixAvecReduction = groupe.commandes.reduce((acc, cmd) => acc + getPrixLivre(cmd.title, cmd), 0);
          const prixOriginal = groupe.commandes.reduce((acc, cmd) => acc + getPrixOriginal(cmd.title, cmd.quantite), 0);
          const economie = prixOriginal - prixAvecReduction;
          const livresListe = groupe.commandes.map(cmd => {
            const prixUnitaire = cmd.quantite ? getPrixLivre(cmd.title, cmd) / cmd.quantite : 0;
            return `${cmd.title} (${cmd.quantite}x à ${prixUnitaire.toFixed(2)}€)`;
          }).join(' | ');
          
          return [
            date.toLocaleDateString('fr-FR'),
            `"${livresListe.replace(/"/g, '""')}"`, // Échapper les guillemets
            quantiteTotale,
            prixOriginal,
            prixAvecReduction,
            economie
          ];
        });

      // Construire le contenu CSV
      const csvContent = [
        entetes.join(','),
        ...donneesCSV.map(ligne => ligne.join(','))
      ].join('\n');

      // Ajouter BOM pour l'UTF-8
      const bom = '\uFEFF';
      const csvAvecBom = bom + csvContent;

      // Créer et télécharger le fichier
      const blob = new Blob([csvAvecBom], { type: 'text/csv;charset=utf-8;' });
      const lien = document.createElement('a');
      
      if (lien.download !== undefined) {
        const url = URL.createObjectURL(blob);
        lien.setAttribute('href', url);
        
        // Nom du fichier avec date et filtre
        const maintenant = new Date();
        const dateStr = maintenant.toISOString().split('T')[0];
        const moisOption = optionsMois.find(m => m.value === moisFiltre);
        const filtreMois = moisFiltre === 'tous' ? 'tous-les-mois' : (moisOption?.label || 'inconnu').toLowerCase().replace('é', 'e').replace('û', 'u');
        const nomFichier = `ventes-${filtreMois}-${ventesFiltrees.length}-commandes-${dateStr}.csv`;
        
        console.log('Nom du fichier CSV:', nomFichier);
        
        lien.setAttribute('download', nomFichier);
        lien.style.visibility = 'hidden';
        document.body.appendChild(lien);
        lien.click();
        document.body.removeChild(lien);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Erreur lors du téléchargement CSV:', error);
      alert('Une erreur est survenue lors du téléchargement. Veuillez réessayer.');
    }
  };

  // Fonction pour télécharger les réceptions en CSV
  const telechargerReceptionsCSV = () => {
    try {
      const receptionsFiltrees = getReceptionsFiltrees();
      
      // Log pour debug
      console.log('Filtre réceptions actuel:', moisFiltreReceptions);
      console.log('Nombre de réceptions filtrées:', receptionsFiltrees.length);
      console.log('Réceptions filtrées:', receptionsFiltrees);
      
      if (receptionsFiltrees.length === 0) {
        alert('Aucune réception à exporter pour cette période.');
        return;
      }

      // Message de confirmation
      const moisOption = optionsMois.find(m => m.value === moisFiltreReceptions);
      const nomMois = moisFiltreReceptions === 'tous' ? 'tous les mois' : moisOption?.label || 'mois inconnu';
      const confirmation = `Téléchargement de ${receptionsFiltrees.length} réception(s) pour ${nomMois}`;
      console.log(confirmation);

      // En-têtes CSV
      const entetes = ['Date', 'Utilisateur', 'Quantité'];
      
      // Données CSV
      const donneesCSV = receptionsFiltrees
        .sort((a, b) => convertirTimestamp(b.date_reception).getTime() - convertirTimestamp(a.date_reception).getTime())
        .map(reception => {
          const date = convertirTimestamp(reception.date_reception);
          
          return [
            date.toLocaleDateString('fr-FR'),
            `"${(reception.name_user || 'Utilisateur inconnu').replace(/"/g, '""')}"`,
            reception.quantite || 0
          ];
        });

      // Construire le contenu CSV
      const csvContent = [
        entetes.join(','),
        ...donneesCSV.map(ligne => ligne.join(','))
      ].join('\n');

      // Ajouter BOM pour l'UTF-8
      const bom = '\uFEFF';
      const csvAvecBom = bom + csvContent;

      // Créer et télécharger le fichier
      const blob = new Blob([csvAvecBom], { type: 'text/csv;charset=utf-8;' });
      const lien = document.createElement('a');
      
      if (lien.download !== undefined) {
        const url = URL.createObjectURL(blob);
        lien.setAttribute('href', url);
        
        // Nom du fichier avec date et filtre
        const maintenant = new Date();
        const dateStr = maintenant.toISOString().split('T')[0];
        const moisOption = optionsMois.find(m => m.value === moisFiltreReceptions);
        const filtreMois = moisFiltreReceptions === 'tous' ? 'tous-les-mois' : (moisOption?.label || 'inconnu').toLowerCase().replace('é', 'e').replace('û', 'u');
        const nomFichier = `receptions-${filtreMois}-${receptionsFiltrees.length}-livraisons-${dateStr}.csv`;
        
        console.log('Nom du fichier CSV réceptions:', nomFichier);
        
        lien.setAttribute('download', nomFichier);
        lien.style.visibility = 'hidden';
        document.body.appendChild(lien);
        lien.click();
        document.body.removeChild(lien);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Erreur lors du téléchargement CSV réceptions:', error);
      alert('Une erreur est survenue lors du téléchargement. Veuillez réessayer.');
    }
  };

  // Fonction pour télécharger le CA en CSV
  const telechargerCACSV = () => {
    try {
      const commandesFiltrees = getCommandesCAFiltrees();
      
      // Log pour debug
      console.log('Filtre CA actuel:', moisFiltreCA);
      console.log('Nombre de commandes filtrées:', commandesFiltrees.length);
      
      if (commandesFiltrees.length === 0) {
        alert('Aucune commande à exporter pour cette période.');
        return;
      }

      // Message de confirmation
      const moisOption = optionsMois.find(m => m.value === moisFiltreCA);
      const nomMois = moisFiltreCA === 'tous' ? 'tous les mois' : moisOption?.label || 'mois inconnu';
      const caTotal = commandesFiltrees.reduce((acc, cmd) => acc + getPrixLivre(cmd.title, cmd), 0);
      const confirmation = `Téléchargement CA de ${formatNumber(caTotal)}€ pour ${nomMois}`;
      console.log(confirmation);

      // En-têtes CSV
      const entetes = ['Date', 'Livre', 'Quantité', 'Prix unitaire (€)', 'Total (€)'];
      
      // Données CSV
      const donneesCSV = commandesFiltrees
        .sort((a, b) => new Date(b.date_achat).getTime() - new Date(a.date_achat).getTime())
        .map(commande => {
          const prixTotal = getPrixLivre(commande.title || '', commande);
          const prixUnitaire = commande.quantite ? prixTotal / commande.quantite : 0;
          const date = new Date(commande.date_achat);
          
          return [
            date.toLocaleDateString('fr-FR'),
            `"${(commande.title || 'Titre inconnu').replace(/"/g, '""')}"`,
            commande.quantite || 0,
            prixUnitaire,
            prixTotal
          ];
        });

      // Construire le contenu CSV
      const csvContent = [
        entetes.join(','),
        ...donneesCSV.map(ligne => ligne.join(','))
      ].join('\n');

      // Ajouter BOM pour l'UTF-8
      const bom = '\uFEFF';
      const csvAvecBom = bom + csvContent;

      // Créer et télécharger le fichier
      const blob = new Blob([csvAvecBom], { type: 'text/csv;charset=utf-8;' });
      const lien = document.createElement('a');
      
      if (lien.download !== undefined) {
        const url = URL.createObjectURL(blob);
        lien.setAttribute('href', url);
        
        // Nom du fichier avec date et filtre
        const maintenant = new Date();
        const dateStr = maintenant.toISOString().split('T')[0];
        const moisOption = optionsMois.find(m => m.value === moisFiltreCA);
        const filtreMois = moisFiltreCA === 'tous' ? 'tous-les-mois' : (moisOption?.label || 'inconnu').toLowerCase().replace('é', 'e').replace('û', 'u');
        const nomFichier = `chiffre-affaires-${filtreMois}-${commandesFiltrees.length}-commandes-${dateStr}.csv`;
        
        console.log('Nom du fichier CSV CA:', nomFichier);
        
        lien.setAttribute('download', nomFichier);
        lien.style.visibility = 'hidden';
        document.body.appendChild(lien);
        lien.click();
        document.body.removeChild(lien);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Erreur lors du téléchargement CSV CA:', error);
      alert('Une erreur est survenue lors du téléchargement. Veuillez réessayer.');
    }
  };

  // Fonction pour télécharger l'inventaire en CSV
  const telechargerInventaireCSV = () => {
    try {
      console.log('Téléchargement inventaire CSV');
      console.log('Inventaire:', inventaire);
      
      if (inventaire.length === 0) {
        alert('Aucun livre en stock à exporter.');
        return;
      }

      // Message de confirmation
      const livresEnStock = inventaire.filter(item => item.quantite > 0);
      const totalLivres = inventaire.reduce((acc, item) => acc + item.quantite, 0);
      const confirmation = `Téléchargement de ${livresEnStock.length} références (${totalLivres} livres)`;
      console.log(confirmation);

      // En-têtes CSV
      const entetes = ['Titre', 'Prix (€)', 'Quantité en stock', 'Valeur stock (€)'];
      
      // Données CSV - tous les livres de l'inventaire
      const donneesCSV = inventaire
        .sort((a, b) => b.quantite - a.quantite) // Trier par quantité décroissante
        .map(livre => {
          const valeurStock = livre.price * livre.quantite;
          
          return [
            `"${(livre.title || 'Titre inconnu').replace(/"/g, '""')}"`,
            livre.price || 0,
            livre.quantite || 0,
            valeurStock
          ];
        });

      // Construire le contenu CSV
      const csvContent = [
        entetes.join(','),
        ...donneesCSV.map(ligne => ligne.join(','))
      ].join('\n');

      // Ajouter BOM pour l'UTF-8
      const bom = '\uFEFF';
      const csvAvecBom = bom + csvContent;

      // Créer et télécharger le fichier
      const blob = new Blob([csvAvecBom], { type: 'text/csv;charset=utf-8;' });
      const lien = document.createElement('a');
      
      if (lien.download !== undefined) {
        const url = URL.createObjectURL(blob);
        lien.setAttribute('href', url);
        
        // Nom du fichier avec date
        const maintenant = new Date();
        const dateStr = maintenant.toISOString().split('T')[0];
        const nomFichier = `inventaire-stock-${inventaire.length}-livres-${dateStr}.csv`;
        
        console.log('Nom du fichier CSV inventaire:', nomFichier);
        
        lien.setAttribute('download', nomFichier);
        lien.style.visibility = 'hidden';
        document.body.appendChild(lien);
        lien.click();
        document.body.removeChild(lien);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Erreur lors du téléchargement CSV inventaire:', error);
      alert('Une erreur est survenue lors du téléchargement. Veuillez réessayer.');
    }
  };
  return (
    <div className={styles.StatistiqueStyle}>
      <Grid gutter="md" style={{ padding: '0 20px', marginBottom: '20px' }}>
        <Grid.Col span={{ base: 12, sm: 6, lg: 3 }}>
          <Card 
            shadow="sm" 
            padding="lg" 
            radius="md" 
            withBorder 
            style={{ cursor: 'pointer', transition: 'transform 0.2s' }}
            onClick={() => setModalVentesOuvert(true)}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            <Group justify="space-between" mb="xs">
              <Text size="lg" fw={500}>Ventes totales</Text>
              <IconShoppingCart size={24} color="#228be6" />
            </Group>
            <Text size="xl" fw={700} c="blue">
              <AnimatedCounter 
                value={statsGlobales.totalVentes} 
                formatFn={(num) => `${formatNumber(num)} livres`}
              />
            </Text>
            <Group mt="xs">
              {statsGlobales.evolutionVentes >= 0 ? (
                <IconTrendingUp size={16} color="green" />
              ) : (
                <IconTrendingDown size={16} color="red" />
              )}
              <Text size="sm" c={statsGlobales.evolutionVentes >= 0 ? "green" : "red"}>
                {Math.abs(statsGlobales.evolutionVentes)} ce mois
              </Text>
            </Group>
            <Text size="xs" c="dimmed" mt="xs">
              👆 Cliquez pour voir les détails
            </Text>
          </Card>
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6, lg: 3 }}>
          <Card 
            shadow="sm" 
            padding="lg" 
            radius="md" 
            withBorder 
            style={{ cursor: 'pointer', transition: 'transform 0.2s' }}
            onClick={() => setModalReceptionsOuvert(true)}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            <Group justify="space-between" mb="xs">
              <Text size="lg" fw={500}>Réceptions totales</Text>
              <IconPackage size={24} color="#40c057" />
            </Group>
            <Text size="xl" fw={700} c="green">
              <AnimatedCounter 
                value={statsGlobales.totalReceptions} 
                formatFn={(num) => `${formatNumber(num)} livres`}
              />
            </Text>
            <Group mt="xs">
              {statsGlobales.evolutionReceptions >= 0 ? (
                <IconTrendingUp size={16} color="green" />
              ) : (
                <IconTrendingDown size={16} color="red" />
              )}
              <Text size="sm" c={statsGlobales.evolutionReceptions >= 0 ? "green" : "red"}>
                {Math.abs(statsGlobales.evolutionReceptions)} ce mois
              </Text>
            </Group>
            <Text size="xs" c="dimmed" mt="xs">
              👆 Cliquez pour voir les détails
            </Text>
          </Card>
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6, lg: 3 }}>
          <Card 
            shadow="sm" 
            padding="lg" 
            radius="md" 
            withBorder 
            style={{ cursor: 'pointer', transition: 'transform 0.2s' }}
            onClick={() => setModalCAOuvert(true)}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            <Group justify="space-between" mb="xs">
              <Text size="lg" fw={500}>Chiffre d&apos;affaires</Text>
              <IconCurrencyEuro size={24} color="#fa5252" />
            </Group>
            <Text size="xl" fw={700} c="red">
              <AnimatedCounter 
                value={statsGlobales.totalMontant} 
                formatFn={(num) => `${formatNumber(num)}€`}
              />
            </Text>
            <Text size="sm" c="dimmed">
              Total des ventes
            </Text>
            <Text size="xs" c="dimmed" mt="xs">
              👆 Cliquez pour voir les détails
            </Text>
          </Card>
        </Grid.Col>

                 <Grid.Col span={{ base: 12, sm: 6, lg: 3 }}>
           <Card 
             shadow="sm" 
             padding="lg" 
             radius="md" 
             withBorder 
             style={{ cursor: 'pointer', transition: 'transform 0.2s' }}
             onClick={() => setModalStockOuvert(true)}
             onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
             onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
           >
             <Group justify="space-between" mb="xs">
               <Text size="lg" fw={500}>Stock actuel</Text>
               <IconUsers size={24} color="#7950f2" />
             </Group>
             <Text size="xl" fw={700} c="violet">
               <AnimatedCounter 
                 value={statsGlobales.totalLivres} 
                 formatFn={(num) => `${formatNumber(num)} livres`}
               />
             </Text>
             <Text size="sm" c="dimmed">
               En inventaire
             </Text>
             <Text size="xs" c="dimmed" mt="xs">
               👆 Cliquez pour voir les détails
             </Text>
           </Card>
         </Grid.Col>

         <Grid.Col span={{ base: 12, sm: 6, lg: 3 }}>
           <Card 
             shadow="sm" 
             padding="lg" 
             radius="md" 
             withBorder 
             style={{ cursor: 'pointer', transition: 'transform 0.2s' }}
             onClick={() => setModalReservationsOuvert(true)}
             onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
             onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
           >
             <Group justify="space-between" mb="xs">
               <Text size="lg" fw={500}>Réservations</Text>
               <IconPackage size={24} color="#fd7e14" />
             </Group>
             <Text size="xl" fw={700} c="orange">
               <AnimatedCounter 
                 value={statsGlobales.totalReservations} 
                 formatFn={(num) => `${formatNumber(num)} livres`}
               />
             </Text>
             <Text size="sm" c="dimmed">
               Livres réservés
             </Text>
             <Text size="xs" c="dimmed" mt="xs">
               👆 Cliquez pour voir les détails
             </Text>
           </Card>
         </Grid.Col>
      </Grid>

      {/* Graphiques */}   
      {/* Modal des détails des ventes */}
      <Modal
        opened={modalVentesOuvert}
        onClose={() => setModalVentesOuvert(false)}
        title="📊 Détails des ventes"
        size="xl"
        centered
        styles={{
          body: {
            maxHeight: '80vh',
            overflow: 'hidden',
          },
        }}
      >
        <Stack gap="md">
          {/* Filtre par mois et bouton téléchargement */}
          <Group justify="space-between" align="center" wrap="wrap">
            <Group align="center">
              <Text size="lg" fw={500}>Filtrer par mois :</Text>
              <Select
                value={moisFiltre}
                onChange={(value) => setMoisFiltre(value || 'tous')}
                data={optionsMois}
                placeholder="Sélectionner un mois"
                style={{ minWidth: 200 }}
              />
            </Group>
            <Button
              leftSection={<IconDownload size={16} />}
              variant="gradient"
              gradient={{ from: 'blue', to: 'cyan' }}
              onClick={telechargerCSV}
              disabled={getVentesFiltrees().length === 0}
            >
              Télécharger CSV
            </Button>
          </Group>

          {/* Statistiques du filtre */}
          <Paper p="md" withBorder radius="md">
            <Group justify="space-around" align="center">
              <div style={{ textAlign: 'center' }}>
                <Text size="xl" fw={700} c="blue">
                  {getVentesFiltrees().reduce((acc, cmd) => acc + cmd.quantite, 0)}
                </Text>
                <Text size="sm" c="dimmed">Livres vendus</Text>
              </div>
              <div style={{ textAlign: 'center' }}>
                <Text size="xl" fw={700} c="green">
                  {formatNumber(getVentesFiltrees().reduce((acc, cmd) => acc + getPrixLivre(cmd.title, cmd), 0))}€
                </Text>
                <Text size="sm" c="dimmed">Chiffre d&apos;affaires</Text>
              </div>
              <div style={{ textAlign: 'center' }}>
                <Text size="xl" fw={700} c="violet">
                  {getVentesFiltrees().length}
                </Text>
                <Text size="sm" c="dimmed">Commandes</Text>
              </div>
            </Group>
          </Paper>

          {/* Tableau responsive */}
          <ScrollArea h={400}>
            <Table striped highlightOnHover withTableBorder>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Date</Table.Th>
                  <Table.Th>Livres vendus</Table.Th>
                  <Table.Th style={{ textAlign: 'center' }}>Quantité totale</Table.Th>
                  <Table.Th style={{ textAlign: 'center' }}>Prix total</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {getVentesFiltrees().length === 0 ? (
                  <Table.Tr>
                    <Table.Td colSpan={4} style={{ textAlign: 'center', padding: '2rem' }}>
                      <Text c="dimmed">Aucune vente trouvée pour ce mois</Text>
                    </Table.Td>
                  </Table.Tr>
                ) : (
                  grouperCommandesParTransaction(getVentesFiltrees())
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .map((groupe, index) => {
                      const date = new Date(groupe.date);
                      const quantiteTotale = groupe.commandes.reduce((acc, cmd) => acc + cmd.quantite, 0);
                      const prixAvecReduction = groupe.commandes.reduce((acc, cmd) => acc + getPrixLivre(cmd.title, cmd), 0);
                      const prixOriginal = groupe.commandes.reduce((acc, cmd) => acc + getPrixOriginal(cmd.title, cmd.quantite), 0);
                      const estOuvert = detailsOuverts.has(groupe.cle);
                      const aReduction = prixOriginal > prixAvecReduction;
                      
                      return (
                        <React.Fragment key={index}>
                          <Table.Tr>
                            <Table.Td>
                              <div>
                                <Text size="sm" fw={500}>
                                  {date.toLocaleDateString('fr-FR', { 
                                    day: '2-digit', 
                                    month: '2-digit',
                                    year: 'numeric'
                                  })}
                                </Text>
                                <Text size="xs" c="dimmed">
                                  {date.toLocaleDateString('fr-FR', { 
                                    weekday: 'long'
                                  })}
                                </Text>
                              </div>
                            </Table.Td>
                            <Table.Td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Text size="sm" fw={500} style={{ maxWidth: '200px' }}>
                                  {groupe.commandes[0].title}
                                  {groupe.commandes.length > 1 && ` +${groupe.commandes.length - 1} autre${groupe.commandes.length > 2 ? 's' : ''}`}
                                </Text>
                                {groupe.commandes.length > 1 && (
                                  <Button
                                    size="xs"
                                    color="red"
                                    variant="filled"
                                    onClick={() => basculerDetails(groupe.cle)}
                                    style={{ minWidth: '24px', height: '24px', padding: '0' }}
                                  >
                                    {estOuvert ? '−' : '+'}
                                  </Button>
                                )}
                              </div>
                            </Table.Td>
                            <Table.Td style={{ textAlign: 'center' }}>
                              <Badge color="blue" size="lg">
                                {quantiteTotale}
                              </Badge>
                            </Table.Td>
                            <Table.Td style={{ textAlign: 'center' }}>
                              <div>
                                {aReduction ? (
                                  <div>
                                    <Text size="sm" fw={500} c="dimmed" td="line-through">
                                      {formatNumber(prixOriginal)}€
                                    </Text>
                                    <Text size="sm" fw={700} c="green" ml="xs">
                                      {formatNumber(prixAvecReduction)}€
                                    </Text>
                                  </div>
                                ) : (
                                  <Text size="sm" fw={700} c="green">
                                    {formatNumber(prixAvecReduction)}€
                                  </Text>
                                )}
                              </div>
                            </Table.Td>
                          </Table.Tr>
                          
                          {/* Détails des autres livres */}
                          {estOuvert && groupe.commandes.length > 1 && (
                            <Table.Tr>
                              <Table.Td colSpan={4} style={{ padding: '0', backgroundColor: '#f8f9fa' }}>
                                <div style={{ padding: '10px' }}>
                                  <Text size="sm" fw={600} mb="xs" c="dimmed">
                                    📚 Détail des {groupe.commandes.length} livres vendus par {groupe.vendeur} :
                                  </Text>
                                  {groupe.commandes.map((commande, cmdIndex) => {
                                    const prixTotal = getPrixLivre(commande.title, commande);
                                    const prixOriginal = getPrixOriginal(commande.title, commande.quantite);
                                    const prixUnitaire = commande.quantite ? prixTotal / commande.quantite : 0;
                                    const aReduction = prixOriginal > prixTotal;
                                    
                                    return (
                                      <div key={cmdIndex} style={{ 
                                        display: 'flex', 
                                        justifyContent: 'space-between', 
                                        alignItems: 'center',
                                        padding: '5px 10px',
                                        backgroundColor: 'white',
                                        borderRadius: '4px',
                                        marginBottom: '5px',
                                        border: '1px solid #e0e0e0'
                                      }}>
                                        <div style={{ flex: 1 }}>
                                          <Text size="xs" fw={500}>
                                            {commande.title}
                                          </Text>
                                          <Text size="xs" c="dimmed">
                                            {commande.quantite}x à {formatNumber(prixUnitaire)}€
                                          </Text>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                          {aReduction ? (
                                            <div>
                                              <Text size="xs" c="dimmed" td="line-through">
                                                {formatNumber(prixOriginal)}€
                                              </Text>
                                              <Text size="xs" fw={600} c="green" ml="xs">
                                                {formatNumber(prixTotal)}€
                                              </Text>
                                            </div>
                                          ) : (
                                            <Text size="xs" fw={600} c="green">
                                              {formatNumber(prixTotal)}€
                                            </Text>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </Table.Td>
                            </Table.Tr>
                          )}
                        </React.Fragment>
                      );
                    })
                )}
              </Table.Tbody>
            </Table>
          </ScrollArea>

          {/* Bouton de fermeture */}
          <Group justify="center" mt="md">
            <Button
              leftSection={<IconX size={16} />}
              variant="light"
              onClick={() => setModalVentesOuvert(false)}
            >
              Fermer
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Modal des détails des réceptions */}
      <Modal
        opened={modalReceptionsOuvert}
        onClose={() => setModalReceptionsOuvert(false)}
        title="📦 Détails des réceptions"
        size="xl"
        centered
        styles={{
          body: {
            maxHeight: '80vh',
            overflow: 'hidden',
          },
        }}
      >
        <Stack gap="md">
          {/* Filtre par mois et bouton téléchargement */}
          <Group justify="space-between" align="center" wrap="wrap">
            <Group align="center">
              <Text size="lg" fw={500}>Filtrer par mois :</Text>
              <Select
                value={moisFiltreReceptions}
                onChange={(value) => {
                  console.log('Changement de filtre réceptions vers:', value);
                  setMoisFiltreReceptions(value || 'tous');
                }}
                data={optionsMois}
                placeholder="Sélectionner un mois"
                style={{ minWidth: 200 }}
              />
            </Group>
            <Button
              leftSection={<IconDownload size={16} />}
              variant="gradient"
              gradient={{ from: 'green', to: 'teal' }}
              onClick={telechargerReceptionsCSV}
              disabled={getReceptionsFiltrees().length === 0}
            >
              Télécharger CSV
            </Button>
          </Group>

          {/* Statistiques du filtre */}
          <Paper p="md" withBorder radius="md">
            <Group justify="space-around" align="center">
              <div style={{ textAlign: 'center' }}>
                <Text size="xl" fw={700} c="green">
                  {getReceptionsFiltrees().reduce((acc, rec) => acc + rec.quantite, 0)}
                </Text>
                <Text size="sm" c="dimmed">Livres reçus</Text>
              </div>
              <div style={{ textAlign: 'center' }}>
                <Text size="xl" fw={700} c="blue">
                  {getReceptionsFiltrees().length}
                </Text>
                <Text size="sm" c="dimmed">Réceptions</Text>
              </div>
              <div style={{ textAlign: 'center' }}>
                <Text size="xl" fw={700} c="violet">
                  {[...new Set(getReceptionsFiltrees().map(rec => rec.name_user))].length}
                </Text>
                <Text size="sm" c="dimmed">Utilisateurs</Text>
              </div>
            </Group>
          </Paper>

          {/* Tableau responsive */}
          <ScrollArea h={400}>
            <Table striped highlightOnHover withTableBorder>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Date</Table.Th>
                  <Table.Th>Utilisateur</Table.Th>
                  <Table.Th style={{ textAlign: 'center' }}>Quantité</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {getReceptionsFiltrees().length === 0 ? (
                  <Table.Tr>
                    <Table.Td colSpan={3} style={{ textAlign: 'center', padding: '2rem' }}>
                      <Text c="dimmed">Aucune réception trouvée pour ce mois</Text>
                    </Table.Td>
                  </Table.Tr>
                ) : (
                  getReceptionsFiltrees()
                    .sort((a, b) => convertirTimestamp(b.date_reception).getTime() - convertirTimestamp(a.date_reception).getTime())
                    .map((reception, index) => {
                      const date = convertirTimestamp(reception.date_reception);
                      
                      return (
                        <Table.Tr key={index}>
                          <Table.Td>
                            <div>
                              <Text size="sm" fw={500}>
                                {date.toLocaleDateString('fr-FR', { 
                                  day: '2-digit', 
                                  month: '2-digit',
                                  year: 'numeric'
                                })}
                              </Text>
                              <Text size="xs" c="dimmed">
                                {date.toLocaleDateString('fr-FR', { 
                                  weekday: 'long'
                                })}
                              </Text>
                            </div>
                          </Table.Td>
                          <Table.Td>
                            <Text size="sm" fw={500}>
                              {reception.name_user || 'Utilisateur inconnu'}
                            </Text>
                          </Table.Td>
                          <Table.Td style={{ textAlign: 'center' }}>
                            <Badge color="green" size="lg">
                              {reception.quantite || 0}
                            </Badge>
                          </Table.Td>
                        </Table.Tr>
                      );
                    })
                )}
              </Table.Tbody>
            </Table>
          </ScrollArea>

          {/* Bouton de fermeture */}
          <Group justify="center" mt="md">
            <Button
              leftSection={<IconX size={16} />}
              variant="light"
              onClick={() => setModalReceptionsOuvert(false)}
            >
              Fermer
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Modal des détails du chiffre d'affaires */}
      <Modal
        opened={modalCAOuvert}
        onClose={() => setModalCAOuvert(false)}
        title="💰 Détails du chiffre d'affaires"
        size="xl"
        centered
        styles={{
          body: {
            maxHeight: '80vh',
            overflow: 'hidden',
          },
        }}
      >
        <Stack gap="md">
          {/* Filtre par mois et bouton téléchargement */}
          <Group justify="space-between" align="center" wrap="wrap">
            <Group align="center">
              <Text size="lg" fw={500}>Filtrer par mois :</Text>
              <Select
                value={moisFiltreCA}
                onChange={(value) => {
                  console.log('Changement de filtre CA vers:', value);
                  setMoisFiltreCA(value || 'tous');
                }}
                data={optionsMois}
                placeholder="Sélectionner un mois"
                style={{ minWidth: 200 }}
              />
            </Group>
            <Button
              leftSection={<IconDownload size={16} />}
              variant="gradient"
              gradient={{ from: 'red', to: 'orange' }}
              onClick={telechargerCACSV}
              disabled={getCommandesCAFiltrees().length === 0}
            >
              Télécharger CSV
            </Button>
          </Group>

          {/* Statistiques du filtre */}
          <Paper p="md" withBorder radius="md">
            <Group justify="space-around" align="center">
              <div style={{ textAlign: 'center' }}>
                <Text size="xl" fw={700} c="red">
                  {formatNumber(getCommandesCAFiltrees().reduce((acc, cmd) => acc + getPrixLivre(cmd.title, cmd), 0))}€
                </Text>
                <Text size="sm" c="dimmed">Chiffre d&apos;affaires</Text>
              </div>
              <div style={{ textAlign: 'center' }}>
                <Text size="xl" fw={700} c="blue">
                  {getCommandesCAFiltrees().reduce((acc, cmd) => acc + cmd.quantite, 0)}
                </Text>
                <Text size="sm" c="dimmed">Livres vendus</Text>
              </div>
              <div style={{ textAlign: 'center' }}>
                <Text size="xl" fw={700} c="violet">
                  {getCommandesCAFiltrees().length}
                </Text>
                <Text size="sm" c="dimmed">Commandes</Text>
              </div>
            </Group>
          </Paper>

          {/* Tableau responsive */}
          <ScrollArea h={400}>
            <Table striped highlightOnHover withTableBorder>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Date</Table.Th>
                  <Table.Th>Livres vendus</Table.Th>
                  <Table.Th style={{ textAlign: 'center' }}>Quantité totale</Table.Th>
                  <Table.Th style={{ textAlign: 'center' }}>Chiffre d&apos;affaires</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {getCommandesCAFiltrees().length === 0 ? (
                  <Table.Tr>
                    <Table.Td colSpan={4} style={{ textAlign: 'center', padding: '2rem' }}>
                      <Text c="dimmed">Aucune commande trouvée pour ce mois</Text>
                    </Table.Td>
                  </Table.Tr>
                ) : (
                  grouperCommandesParTransaction(getCommandesCAFiltrees())
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .map((groupe, index) => {
                      const date = new Date(groupe.date);
                      const quantiteTotale = groupe.commandes.reduce((acc, cmd) => acc + cmd.quantite, 0);
                      const prixAvecReduction = groupe.commandes.reduce((acc, cmd) => acc + getPrixLivre(cmd.title, cmd), 0);
                      const prixOriginal = groupe.commandes.reduce((acc, cmd) => acc + getPrixOriginal(cmd.title, cmd.quantite), 0);
                      const estOuvert = detailsOuverts.has(groupe.cle);
                      const aReduction = prixOriginal > prixAvecReduction;
                      
                      return (
                        <React.Fragment key={index}>
                          <Table.Tr>
                            <Table.Td>
                              <div>
                                <Text size="sm" fw={500}>
                                  {date.toLocaleDateString('fr-FR', { 
                                    day: '2-digit', 
                                    month: '2-digit',
                                    year: 'numeric'
                                  })}
                                </Text>
                                <Text size="xs" c="dimmed">
                                  {date.toLocaleDateString('fr-FR', { 
                                    weekday: 'long'
                                  })}
                                </Text>
                              </div>
                            </Table.Td>
                            <Table.Td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Text size="sm" fw={500} style={{ maxWidth: '200px' }}>
                                  {groupe.commandes[0].title}
                                  {groupe.commandes.length > 1 && ` +${groupe.commandes.length - 1} autre${groupe.commandes.length > 2 ? 's' : ''}`}
                                </Text>
                                {groupe.commandes.length > 1 && (
                                  <Button
                                    size="xs"
                                    color="red"
                                    variant="filled"
                                    onClick={() => basculerDetails(groupe.cle)}
                                    style={{ minWidth: '24px', height: '24px', padding: '0' }}
                                  >
                                    {estOuvert ? '−' : '+'}
                                  </Button>
                                )}
                              </div>
                            </Table.Td>
                            <Table.Td style={{ textAlign: 'center' }}>
                              <Badge color="blue" size="lg">
                                {quantiteTotale}
                              </Badge>
                            </Table.Td>
                            <Table.Td style={{ textAlign: 'center' }}>
                              <div>
                                {aReduction ? (
                                  <div>
                                    <Text size="sm" fw={500} c="dimmed" td="line-through">
                                      {formatNumber(prixOriginal)}€
                                    </Text>
                                    <Text size="sm" fw={700} c="red" ml="xs">
                                      {formatNumber(prixAvecReduction)}€
                                    </Text>
                                  </div>
                                ) : (
                                  <Text size="sm" fw={700} c="red">
                                    {formatNumber(prixAvecReduction)}€
                                  </Text>
                                )}
                              </div>
                            </Table.Td>
                          </Table.Tr>
                          
                          {/* Détails des autres livres */}
                          {estOuvert && groupe.commandes.length > 1 && (
                            <Table.Tr>
                              <Table.Td colSpan={4} style={{ padding: '0', backgroundColor: '#f8f9fa' }}>
                                <div style={{ padding: '10px' }}>
                                  <Text size="sm" fw={600} mb="xs" c="dimmed">
                                    📚 Détail des {groupe.commandes.length} livres vendus par {groupe.vendeur} :
                                  </Text>
                                  {groupe.commandes.map((commande, cmdIndex) => {
                                    const prixTotal = getPrixLivre(commande.title, commande);
                                    const prixOriginal = getPrixOriginal(commande.title, commande.quantite);
                                    const prixUnitaire = commande.quantite ? prixTotal / commande.quantite : 0;
                                    const aReduction = prixOriginal > prixTotal;
                                    
                                    return (
                                      <div key={cmdIndex} style={{ 
                                        display: 'flex', 
                                        justifyContent: 'space-between', 
                                        alignItems: 'center',
                                        padding: '5px 10px',
                                        backgroundColor: 'white',
                                        borderRadius: '4px',
                                        marginBottom: '5px',
                                        border: '1px solid #e0e0e0'
                                      }}>
                                        <div style={{ flex: 1 }}>
                                          <Text size="xs" fw={500}>
                                            {commande.title}
                                          </Text>
                                          <Text size="xs" c="dimmed">
                                            {commande.quantite}x à {formatNumber(prixUnitaire)}€
                                          </Text>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                          {aReduction ? (
                                            <div>
                                              <Text size="xs" c="dimmed" td="line-through">
                                                {formatNumber(prixOriginal)}€
                                              </Text>
                                              <Text size="xs" fw={600} c="red" ml="xs">
                                                {formatNumber(prixTotal)}€
                                              </Text>
                                            </div>
                                          ) : (
                                            <Text size="xs" fw={600} c="red">
                                              {formatNumber(prixTotal)}€
                                            </Text>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </Table.Td>
                            </Table.Tr>
                          )}
                        </React.Fragment>
                      );
                    })
                )}
              </Table.Tbody>
            </Table>
          </ScrollArea>

          {/* Bouton de fermeture */}
          <Group justify="center" mt="md">
            <Button
              leftSection={<IconX size={16} />}
              variant="light"
              onClick={() => setModalCAOuvert(false)}
            >
              Fermer
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Modal de l'inventaire */}
      <Modal
        opened={modalStockOuvert}
        onClose={() => setModalStockOuvert(false)}
        title="📚 Inventaire des livres"
        size="xl"
        centered
        styles={{
          body: {
            maxHeight: '80vh',
            overflow: 'hidden',
          },
        }}
      >
        <Stack gap="md">
          {/* Bouton téléchargement */}
          <Group justify="space-between" align="center" wrap="wrap">
            <Text size="lg" fw={500}>Liste complète de l&apos;inventaire</Text>
            <Button
              leftSection={<IconDownload size={16} />}
              variant="gradient"
              gradient={{ from: 'violet', to: 'purple' }}
              onClick={telechargerInventaireCSV}
              disabled={inventaire.length === 0}
            >
              Télécharger CSV
            </Button>
          </Group>

          {/* Statistiques de l'inventaire */}
          <Paper p="md" withBorder radius="md">
            <Group justify="space-around" align="center">
              <div style={{ textAlign: 'center' }}>
                <Text size="xl" fw={700} c="violet">
                  {inventaire.length}
                </Text>
                <Text size="sm" c="dimmed">Références</Text>
              </div>
              <div style={{ textAlign: 'center' }}>
                <Text size="xl" fw={700} c="blue">
                  {formatNumber(inventaire.reduce((acc, item) => acc + item.quantite, 0))}
                </Text>
                <Text size="sm" c="dimmed">Livres en stock</Text>
              </div>
              <div style={{ textAlign: 'center' }}>
                <Text size="xl" fw={700} c="green">
                  {formatNumber(inventaire.reduce((acc, item) => acc + (item.price * item.quantite), 0))}€
                </Text>
                <Text size="sm" c="dimmed">Valeur du stock</Text>
              </div>
              <div style={{ textAlign: 'center' }}>
                <Text size="xl" fw={700} c="orange">
                  {inventaire.filter(item => item.quantite > 0).length}
                </Text>
                <Text size="sm" c="dimmed">Disponibles</Text>
              </div>
            </Group>
          </Paper>

          {/* Tableau de l'inventaire */}
          <ScrollArea h={400}>
            <Table striped highlightOnHover withTableBorder>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Titre du livre</Table.Th>
                  <Table.Th style={{ textAlign: 'center' }}>Prix (€)</Table.Th>
                  <Table.Th style={{ textAlign: 'center' }}>Stock</Table.Th>
                  <Table.Th style={{ textAlign: 'center' }}>Valeur (€)</Table.Th>
                  <Table.Th style={{ textAlign: 'center' }}>Statut</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {inventaire.length === 0 ? (
                  <Table.Tr>
                    <Table.Td colSpan={5} style={{ textAlign: 'center', padding: '2rem' }}>
                      <Text c="dimmed">Aucun livre en inventaire</Text>
                    </Table.Td>
                  </Table.Tr>
                ) : (
                  inventaire
                    .sort((a, b) => b.quantite - a.quantite) // Trier par stock décroissant
                    .map((livre, index) => {
                      const valeurStock = livre.price * livre.quantite;
                      const enStock = livre.quantite > 0;
                      
                      return (
                        <Table.Tr key={index} style={{ 
                          opacity: enStock ? 1 : 0.6,
                          backgroundColor: !enStock ? '#f8f9fa' : undefined 
                        }}>
                          <Table.Td>
                            <Text size="sm" fw={500} style={{ maxWidth: '300px' }}>
                              {livre.title || 'Titre non défini'}
                            </Text>
                          </Table.Td>
                          <Table.Td style={{ textAlign: 'center' }}>
                            <Text size="sm" fw={500}>
                              {formatNumber(livre.price)}€
                            </Text>
                          </Table.Td>
                          <Table.Td style={{ textAlign: 'center' }}>
                            <Badge 
                              color={enStock ? 'blue' : 'gray'} 
                              size="lg"
                            >
                              {livre.quantite}
                            </Badge>
                          </Table.Td>
                          <Table.Td style={{ textAlign: 'center' }}>
                            <Text size="sm" fw={600} c={enStock ? "green" : "gray"}>
                              {formatNumber(valeurStock)}€
                            </Text>
                          </Table.Td>
                          <Table.Td style={{ textAlign: 'center' }}>
                            <Badge 
                              color={enStock ? 'green' : 'red'} 
                              variant={enStock ? 'filled' : 'outline'}
                            >
                              {enStock ? 'En stock' : 'Rupture'}
                            </Badge>
                          </Table.Td>
                        </Table.Tr>
                      );
                    })
                )}
              </Table.Tbody>
            </Table>
          </ScrollArea>

          {/* Bouton de fermeture */}
          <Group justify="center" mt="md">
            <Button
              leftSection={<IconX size={16} />}
              variant="light"
              onClick={() => setModalStockOuvert(false)}
            >
              Fermer
            </Button>
                     </Group>
         </Stack>
       </Modal>

       {/* Modal des réservations */}
       <Modal
         opened={modalReservationsOuvert}
         onClose={() => setModalReservationsOuvert(false)}
         title="📅 Détails des réservations"
         size="xl"
         centered
         styles={{
           body: {
             maxHeight: '80vh',
             overflow: 'hidden',
           },
         }}
       >
         <Stack gap="md">
           {/* Statistiques des réservations */}
           <Paper p="md" withBorder radius="md">
             <Group justify="space-around" align="center">
               <div style={{ textAlign: 'center' }}>
                 <Text size="xl" fw={700} c="orange">
                   {toutesLesReservations.reduce((acc, res) => acc + res.quantite_bloquee, 0)}
                 </Text>
                 <Text size="sm" c="dimmed">Livres réservés</Text>
               </div>
               <div style={{ textAlign: 'center' }}>
                 <Text size="xl" fw={700} c="blue">
                   {toutesLesReservations.length}
                 </Text>
                 <Text size="sm" c="dimmed">Réservations actives</Text>
               </div>
               <div style={{ textAlign: 'center' }}>
                 <Text size="xl" fw={700} c="violet">
                   {[...new Set(toutesLesReservations.map(res => res.inventaire?.title))].length}
                 </Text>
                 <Text size="sm" c="dimmed">Livres différents</Text>
               </div>
             </Group>
           </Paper>

           {/* Tableau des réservations */}
           <ScrollArea h={400}>
             <Table striped highlightOnHover withTableBorder>
               <Table.Thead>
                 <Table.Tr>
                   <Table.Th>Livre</Table.Th>
                   <Table.Th style={{ textAlign: 'center' }}>Quantité réservée</Table.Th>
                   <Table.Th>Date de création</Table.Th>
                   <Table.Th>Date d&apos;expiration</Table.Th>
                   <Table.Th style={{ textAlign: 'center' }}>Statut</Table.Th>
                 </Table.Tr>
               </Table.Thead>
               <Table.Tbody>
                 {toutesLesReservations.length === 0 ? (
                   <Table.Tr>
                     <Table.Td colSpan={5} style={{ textAlign: 'center', padding: '2rem' }}>
                       <Text c="dimmed">Aucune réservation active</Text>
                     </Table.Td>
                   </Table.Tr>
                 ) : (
                   toutesLesReservations
                     .sort((a, b) => new Date(b.date_creation).getTime() - new Date(a.date_creation).getTime())
                     .map((reservation, index) => {
                       const dateCreation = new Date(reservation.date_creation);
                       const dateExpiration = new Date(reservation.date_expiration);
                       const maintenant = new Date();
                       const estExpiree = dateExpiration < maintenant;
                       
                       return (
                         <Table.Tr key={index} style={{ 
                           opacity: estExpiree ? 0.6 : 1,
                           backgroundColor: estExpiree ? '#f8f9fa' : undefined 
                         }}>
                           <Table.Td>
                             <Text size="sm" fw={500} style={{ maxWidth: '200px' }}>
                               {reservation.inventaire?.title || 'Titre non défini'}
                             </Text>
                           </Table.Td>
                           <Table.Td style={{ textAlign: 'center' }}>
                             <Badge color="orange" size="lg">
                               {reservation.quantite_bloquee}
                             </Badge>
                           </Table.Td>
                           <Table.Td>
                             <Text size="sm" fw={500}>
                               {dateCreation.toLocaleDateString('fr-FR')}
                             </Text>
                           </Table.Td>
                           <Table.Td>
                             <Text size="sm" fw={500}>
                               {dateExpiration.toLocaleDateString('fr-FR')}
                             </Text>
                           </Table.Td>
                           <Table.Td style={{ textAlign: 'center' }}>
                             <Badge 
                               color={estExpiree ? 'red' : 'green'} 
                               variant={estExpiree ? 'outline' : 'filled'}
                             >
                               {estExpiree ? 'Expirée' : 'Active'}
                             </Badge>
                           </Table.Td>
                         </Table.Tr>
                       );
                     })
                 )}
               </Table.Tbody>
             </Table>
           </ScrollArea>

           {/* Bouton de fermeture */}
           <Group justify="center" mt="md">
             <Button
               leftSection={<IconX size={16} />}
               variant="light"
               onClick={() => setModalReservationsOuvert(false)}
             >
               Fermer
             </Button>
           </Group>
         </Stack>
       </Modal>
     </div>
   );
}
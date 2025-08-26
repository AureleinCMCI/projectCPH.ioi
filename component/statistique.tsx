'use client';

import { BarChart } from '@mantine/charts';
import { Badge, Button, Card, Center, Grid, Group, Loader, Modal, Paper, RingProgress, ScrollArea, Select, Stack, Table, Text, Title } from '@mantine/core';
import { IconCurrencyEuro, IconDownload, IconPackage, IconShoppingCart, IconTrendingDown, IconTrendingUp, IconUsers, IconX } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import styles from './style/statistique.module.css';

type VenteStats = {
  date: string;
  quantite: number;
  montant: number;
};

type ReceptionStats = {
  date: string;
  quantite: number;
  user: string;
};

type StatsGlobales = {
  totalVentes: number;
  totalReceptions: number;
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

type InventaireItem = {
  title: string;
  price: number;
  quantite: number;
};

export default function Statistique() {
  const [statsGlobales, setStatsGlobales] = useState<StatsGlobales>({
    totalVentes: 0,
    totalReceptions: 0,
    totalMontant: 0,
    totalLivres: 0,
    evolutionVentes: 0,
    evolutionReceptions: 0,
    ventesMoisActuel: 0,
    chiffreAffairesMoisActuel: 0,
    receptionsMoisActuel: 0
  });
  
  const [ventesMensuelles, setVentesMensuelles] = useState<VenteStats[]>([]);
  const [receptionsMensuelles, setReceptionsMensuelles] = useState<ReceptionStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVentesOuvert, setModalVentesOuvert] = useState(false);
  const [modalReceptionsOuvert, setModalReceptionsOuvert] = useState(false);
  const [modalCAOuvert, setModalCAOuvert] = useState(false);
  const [modalStockOuvert, setModalStockOuvert] = useState(false);
  const [toutesLesCommandes, setToutesLesCommandes] = useState<Commande[]>([]);
  const [toutesLesReceptions, setToutesLesReceptions] = useState<Reception[]>([]);
  const [inventaire, setInventaire] = useState<InventaireItem[]>([]);
  const [moisFiltre, setMoisFiltre] = useState<string>('tous');
  const [moisFiltreReceptions, setMoisFiltreReceptions] = useState<string>('tous');
  const [moisFiltreCA, setMoisFiltreCA] = useState<string>('tous');

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
        
        // Calculer les statistiques globales
        const totalVentes = commandes.data?.reduce((acc: number, cmd: Commande) => acc + cmd.quantite, 0) || 0;
        const totalReceptions = receptions.user?.reduce((acc: number, rec: Reception) => acc + rec.quantite, 0) || 0;
        const totalMontant = commandes.data?.reduce((acc: number, cmd: Commande) => {
          const livre = inventaire.data?.find((item: InventaireItem) => item.title === cmd.title);
          return acc + (livre?.price || 0) * cmd.quantite;
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
          const livre = inventaire.data?.find((item: InventaireItem) => item.title === cmd.title);
          return acc + (livre?.price || 0) * cmd.quantite;
        }, 0);
        
        // Calculer les réceptions du mois actuel pour comparaison
        const receptionsMoisActuel = receptions.user?.filter((rec: Reception) => {
          const dateReception = convertirTimestamp(rec.date_reception);
          return dateReception >= debutMoisActuel && dateReception <= finMoisActuel;
        }).reduce((acc: number, rec: Reception) => acc + rec.quantite, 0) || 0;
        
        setStatsGlobales({
          totalVentes,
          totalReceptions,
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
        setInventaire(inventaire.data || []);
        
        // Debug logs pour vérifier les données
        console.log('Réceptions récupérées:', receptions.user);
        console.log('Nombre de réceptions:', receptions.user?.length || 0);
        
        // Préparer les données pour les graphiques
        const ventesParMois = prepareVentesParMois(commandes.data || []);
        const receptionsParMois = prepareReceptionsParMois(receptions.user || []);
        
        setVentesMensuelles(ventesParMois);
        setReceptionsMensuelles(receptionsParMois);
        
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

  const prepareVentesParMois = (commandes: Commande[]): VenteStats[] => {
    const mois = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
    const ventesParMois = new Array(12).fill(0).map((_, index) => ({
      date: mois[index],
      quantite: 0,
      montant: 0
    }));
    
    commandes.forEach((cmd: Commande) => {
      const date = new Date(cmd.date_achat);
      const moisIndex = date.getMonth();
      ventesParMois[moisIndex].quantite += cmd.quantite;
    });
    
    return ventesParMois;
  };

  const prepareReceptionsParMois = (receptions: Reception[]): ReceptionStats[] => {
    const mois = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
    const receptionsParMois = new Array(12).fill(0).map((_, index) => ({
      date: mois[index],
      quantite: 0,
      user: ''
    }));
    
    receptions.forEach((rec: Reception) => {
      const date = convertirTimestamp(rec.date_reception);
      const moisIndex = date.getMonth();
      receptionsParMois[moisIndex].quantite += rec.quantite;
    });
    
    return receptionsParMois;
  };

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
  const getPrixLivre = (title: string): number => {
    const livre = inventaire.find(item => item.title === title);
    return livre?.price || 0;
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
      const entetes = ['Date', 'Livre', 'Quantité', 'Prix unitaire (€)', 'Total (€)'];
      
      // Données CSV
      const donneesCSV = ventesFiltrees
        .sort((a, b) => new Date(b.date_achat).getTime() - new Date(a.date_achat).getTime())
        .map(commande => {
          const prixUnitaire = getPrixLivre(commande.title || '');
          const total = prixUnitaire * (commande.quantite || 0);
          const date = new Date(commande.date_achat);
          
          return [
            date.toLocaleDateString('fr-FR'),
            `"${(commande.title || 'Titre inconnu').replace(/"/g, '""')}"`, // Échapper les guillemets
            commande.quantite || 0,
            prixUnitaire,
            total
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
      const caTotal = commandesFiltrees.reduce((acc, cmd) => acc + (getPrixLivre(cmd.title) * cmd.quantite), 0);
      const confirmation = `Téléchargement CA de ${formatNumber(caTotal)}€ pour ${nomMois}`;
      console.log(confirmation);

      // En-têtes CSV
      const entetes = ['Date', 'Livre', 'Quantité', 'Prix unitaire (€)', 'Total (€)'];
      
      // Données CSV
      const donneesCSV = commandesFiltrees
        .sort((a, b) => new Date(b.date_achat).getTime() - new Date(a.date_achat).getTime())
        .map(commande => {
          const prixUnitaire = getPrixLivre(commande.title || '');
          const total = prixUnitaire * (commande.quantite || 0);
          const date = new Date(commande.date_achat);
          
          return [
            date.toLocaleDateString('fr-FR'),
            `"${(commande.title || 'Titre inconnu').replace(/"/g, '""')}"`,
            commande.quantite || 0,
            prixUnitaire,
            total
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
      {/* Header avec icône statistiques */}
      <div className={styles.revolutAmount}>
        <div className={styles.revolutLabel}>📊 Statistiques</div>
        <div className={styles.revolutValue}>Vue des statistiques en temps réel</div>
        <div className={styles.revolutQuickActions}>
          <div className={styles.quickAction}>
            <div className={styles.revolutdiv}>
              <span>🔄</span>
              <div className={styles.quickActionLabel}>Mise à jour auto</div>
            </div>
          </div>
        </div>
      </div>
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
              {statsGlobales.totalVentes} livres
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
              {statsGlobales.totalReceptions} livres
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
              {formatNumber(statsGlobales.totalMontant)}€
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
              {formatNumber(statsGlobales.totalLivres)} livres
            </Text>
            <Text size="sm" c="dimmed">
              En inventaire
            </Text>
            <Text size="xs" c="dimmed" mt="xs">
              👆 Cliquez pour voir les détails
            </Text>
          </Card>
        </Grid.Col>
      </Grid>

      {/* Graphiques */}
      <Grid gutter="md" style={{ padding: '0 20px', marginBottom: '20px' }}>
        <Grid.Col span={{ base: 12, lg: 6 }}>
          <Paper shadow="sm" p="md" radius="md" withBorder>
            <Title order={3} mb="md" ta="center">�� Évolution des ventes mensuelles</Title>
            <div style={{ height: '300px' }}>
              <BarChart
                data={ventesMensuelles}
                dataKey="date"
                series={[{ name: 'Livres vendus', color: '#228be6' }]}
                style={{ height: '300px' }}
                valueFormatter={(value: number) => `${value} livres`}
              />
            </div>
          </Paper>
        </Grid.Col>

        <Grid.Col span={{ base: 12, lg: 6 }}>
          <Paper shadow="sm" p="md" radius="md" withBorder>
            <Title order={3} mb="md" ta="center">📦 Évolution des réceptions mensuelles</Title>
            <div style={{ height: '300px' }}>
              <BarChart
                data={receptionsMensuelles}
                dataKey="date"
                series={[{ name: 'Livres reçus', color: '#40c057' }]}
                style={{ height: '300px' }}
                valueFormatter={(value: number) => `${value} livres`}
              />
            </div>
          </Paper>
        </Grid.Col>
      </Grid>

      {/* Indicateurs de performance */}
      <Grid gutter="md" style={{ padding: '0 20px' }}>
        <Grid.Col span={{ base: 12, lg: 6 }}>
          <Paper shadow="sm" p="md" radius="md" withBorder>
            <Title order={3} mb="md" ta="center">🎯 Performance des ventes</Title>
            <Stack align="center" gap="md">
              <RingProgress
                size={120}
                thickness={12}
                sections={[
                  { 
                    value: statsGlobales.totalVentes > 0 ? 
                      (statsGlobales.totalVentes / (statsGlobales.totalVentes + statsGlobales.totalReceptions)) * 100 : 0, 
                    color: '#228be6' 
                  }
                ]}
                label={
                  <Text ta="center" size="lg" fw={700}>
                    {statsGlobales.totalVentes > 0 ? 
                      Math.round((statsGlobales.totalVentes / (statsGlobales.totalVentes + statsGlobales.totalReceptions)) * 100) : 0}%
                  </Text>
                }
              />
              <Text size="sm" c="dimmed" ta="center">
                Taux de rotation des stocks
              </Text>
            </Stack>
          </Paper>
        </Grid.Col>

        <Grid.Col span={{ base: 12, lg: 6 }}>
          <Paper shadow="sm" p="md" radius="md" withBorder>
            <Title order={3} mb="md" ta="center">📊 Résumé mensuel</Title>
            <Stack gap="sm">
              <Group justify="space-between">
                <Text>Ventes du mois :</Text>
                <Badge color="blue" size="lg">
                  {statsGlobales.ventesMoisActuel} livres
                </Badge>
              </Group>
              <Group justify="space-between">
                <Text>CA du mois :</Text>
                <Badge color="orange" size="lg">
                  {formatNumber(statsGlobales.chiffreAffairesMoisActuel)}€
                </Badge>
              </Group>
              <Group justify="space-between">
                <Text>Réceptions du mois :</Text>
                <Badge color="green" size="lg">
                  {statsGlobales.receptionsMoisActuel} livres
                </Badge>
              </Group>
              <Group justify="space-between">
                <Text>Stock disponible :</Text>
                <Badge color="violet" size="lg">
                  {statsGlobales.totalLivres} livres
                </Badge>
              </Group>
            </Stack>
          </Paper>
        </Grid.Col>
      </Grid>

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
                  {formatNumber(getVentesFiltrees().reduce((acc, cmd) => acc + (getPrixLivre(cmd.title) * cmd.quantite), 0))}€
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
                  <Table.Th>Livre</Table.Th>
                  <Table.Th style={{ textAlign: 'center' }}>Quantité</Table.Th>
                  <Table.Th style={{ textAlign: 'center' }}>Prix unit.</Table.Th>
                  <Table.Th style={{ textAlign: 'center' }}>Total</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {getVentesFiltrees().length === 0 ? (
                  <Table.Tr>
                    <Table.Td colSpan={5} style={{ textAlign: 'center', padding: '2rem' }}>
                      <Text c="dimmed">Aucune vente trouvée pour ce mois</Text>
                    </Table.Td>
                  </Table.Tr>
                ) : (
                  getVentesFiltrees()
                    .sort((a, b) => new Date(b.date_achat).getTime() - new Date(a.date_achat).getTime())
                    .map((commande, index) => {
                      const prixUnitaire = getPrixLivre(commande.title);
                      const total = prixUnitaire * commande.quantite;
                      const date = new Date(commande.date_achat);
                      
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
                            <Text size="sm" fw={500} style={{ maxWidth: '200px' }}>
                              {commande.title}
                            </Text>
                          </Table.Td>
                          <Table.Td style={{ textAlign: 'center' }}>
                            <Badge color="blue" size="lg">
                              {commande.quantite}
                            </Badge>
                          </Table.Td>
                          <Table.Td style={{ textAlign: 'center' }}>
                            <Text size="sm" fw={500}>
                              {formatNumber(prixUnitaire)}€
                            </Text>
                          </Table.Td>
                          <Table.Td style={{ textAlign: 'center' }}>
                            <Text size="sm" fw={700} c="green">
                              {formatNumber(total)}€
                            </Text>
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
                  {formatNumber(getCommandesCAFiltrees().reduce((acc, cmd) => acc + (getPrixLivre(cmd.title) * cmd.quantite), 0))}€
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
                  <Table.Th>Livre</Table.Th>
                  <Table.Th style={{ textAlign: 'center' }}>Quantité</Table.Th>
                  <Table.Th style={{ textAlign: 'center' }}>Prix unit.</Table.Th>
                  <Table.Th style={{ textAlign: 'center' }}>Total</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {getCommandesCAFiltrees().length === 0 ? (
                  <Table.Tr>
                    <Table.Td colSpan={5} style={{ textAlign: 'center', padding: '2rem' }}>
                      <Text c="dimmed">Aucune commande trouvée pour ce mois</Text>
                    </Table.Td>
                  </Table.Tr>
                ) : (
                  getCommandesCAFiltrees()
                    .sort((a, b) => new Date(b.date_achat).getTime() - new Date(a.date_achat).getTime())
                    .map((commande, index) => {
                      const prixUnitaire = getPrixLivre(commande.title);
                      const total = prixUnitaire * commande.quantite;
                      const date = new Date(commande.date_achat);
                      
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
                            <Text size="sm" fw={500} style={{ maxWidth: '200px' }}>
                              {commande.title}
                            </Text>
                          </Table.Td>
                          <Table.Td style={{ textAlign: 'center' }}>
                            <Badge color="blue" size="lg">
                              {commande.quantite}
                            </Badge>
                          </Table.Td>
                          <Table.Td style={{ textAlign: 'center' }}>
                            <Text size="sm" fw={500}>
                              {formatNumber(prixUnitaire)}€
                            </Text>
                          </Table.Td>
                          <Table.Td style={{ textAlign: 'center' }}>
                            <Text size="sm" fw={700} c="red">
                              {formatNumber(total)}€
                            </Text>
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
    </div>
  );
}
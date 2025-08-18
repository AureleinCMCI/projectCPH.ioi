'use client';

import { useEffect, useState } from 'react';
import { Card, Text, Group, RingProgress, Title, Grid, Paper, Stack, Badge, Center, Loader } from '@mantine/core';
import { BarChart } from '@mantine/charts';
import { IconTrendingUp, IconTrendingDown, IconPackage, IconShoppingCart, IconUsers, IconCurrencyEuro } from '@tabler/icons-react';
import styles from './style/monCompte.module.css';

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
};

type Commande = {
  date_achat: string;
  quantite: number;
  title: string;
};

type Reception = {
  date_reception: string;
  quantite: number;
  user: string;
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
    evolutionReceptions: 0
  });
  
  const [ventesMensuelles, setVentesMensuelles] = useState<VenteStats[]>([]);
  const [receptionsMensuelles, setReceptionsMensuelles] = useState<ReceptionStats[]>([]);
  const [loading, setLoading] = useState(true);

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
        const totalReceptions = receptions.data?.reduce((acc: number, rec: Reception) => acc + rec.quantite, 0) || 0;
        const totalMontant = commandes.data?.reduce((acc: number, cmd: Commande) => {
          const livre = inventaire.data?.find((item: InventaireItem) => item.title === cmd.title);
          return acc + (livre?.price || 0) * cmd.quantite;
        }, 0) || 0;
        const totalLivres = inventaire.data?.reduce((acc: number, item: InventaireItem) => acc + item.quantite, 0) || 0;
        
        // Calculer l'évolution (comparaison avec le mois précédent)
        const maintenant = new Date();
        const moisPrecedent = new Date(maintenant.getFullYear(), maintenant.getMonth() - 1, 1);
        
        const ventesMoisPrecedent = commandes.data?.filter((cmd: Commande) => 
          new Date(cmd.date_achat) >= moisPrecedent
        ).reduce((acc: number, cmd: Commande) => acc + cmd.quantite, 0) || 0;
        
        const receptionsMoisPrecedent = receptions.data?.filter((rec: Reception) => 
          new Date(rec.date_reception) >= moisPrecedent
        ).reduce((acc: number, rec: Reception) => acc + rec.quantite, 0) || 0;
        
        setStatsGlobales({
          totalVentes,
          totalReceptions,
          totalMontant,
          totalLivres,
          evolutionVentes: totalVentes - ventesMoisPrecedent,
          evolutionReceptions: totalReceptions - receptionsMoisPrecedent
        });
        
        // Préparer les données pour les graphiques
        const ventesParMois = prepareVentesParMois(commandes.data || []);
        const receptionsParMois = prepareReceptionsParMois(receptions.data || []);
        
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
      const date = new Date(rec.date_reception);
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
    return num.toLocaleString('fr-FR');
  };
  return (
    <div className={styles.revolutStyle}>
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

      {/* Cartes de statistiques principales */}
      <Grid gutter="md" style={{ padding: '0 20px', marginBottom: '20px' }}>
        <Grid.Col span={{ base: 12, sm: 6, lg: 3 }}>
          <Card shadow="sm" padding="lg" radius="md" withBorder>
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
          </Card>
        </Grid.Col>

        <Grid.Col span={{ base: 12, sm: 6, lg: 3 }}>
          <Card shadow="sm" padding="lg" radius="md" withBorder>
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
          </Card>
        </Grid.Col>

        <Grid.Col span={{ base: 12, sm: 6, lg: 3 }}>
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Group justify="space-between" mb="xs">
              <Text size="lg" fw={500}>Chiffre des affaires</Text>
              <IconCurrencyEuro size={24} color="#fa5252" />
            </Group>
            <Text size="xl" fw={700} c="red">
              {formatNumber(statsGlobales.totalMontant)}€
            </Text>
            <Text size="sm" c="dimmed">
              Total des ventes
            </Text>
          </Card>
        </Grid.Col>

        <Grid.Col span={{ base: 12, sm: 6, lg: 3 }}>
          <Card shadow="sm" padding="lg" radius="md" withBorder>
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
                  {statsGlobales.evolutionVentes} livres
                </Badge>
              </Group>
              <Group justify="space-between">
                <Text>Réceptions du mois :</Text>
                <Badge color="green" size="lg">
                  {statsGlobales.evolutionReceptions} livres
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
    </div>
  );
}
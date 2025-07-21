'use client';

import { Button, Center, Loader, Modal, Paper, Table, Title } from '@mantine/core';
import { IconBook, IconListDetails } from '@tabler/icons-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import styles from './style/inventaire.module.css';

type InventaireItem = {
  id: number;
  title: string;
  author: string;
  quantite: number;
  price: number;
  isbn: number;
};
type HistoriqueItem = {
  id: number;
  date_reception: string;
  quantite: number;
  livre_id: {
    title: string;
  };
  name_user: string;
  livre_title: string;
};
export default function Inventaire() {
  const [inventaire, setInventaire] = useState<InventaireItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [opened, setOpened] = useState(false);
  const [historique, setHistorique] = useState<HistoriqueItem[]>([]);
  const [user, setUser] = useState<{ admin?: boolean } | null>(null);

  useEffect(() => {
    async function fetchInventaire() {
      const response = await fetch('/api/inventaire');
      const result = await response.json();
      setInventaire(result.data || []);
      setLoading(false);
    }
    fetchInventaire();
  }, []);


  useEffect(() => {
    async function RecupereHistorique() {
      const response = await fetch('/api/historiqueResception');
      const result = await response.json();
      console.log('Réponse API historique:', result);
      setHistorique(result.user || []);
    }
    RecupereHistorique();
  }, []);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('jwt') : null;
    if (token) {
      try {
        const decoded = JSON.parse(atob(token.split('.')[1]));
        setUser(decoded);
      } catch {
        setUser(null);
      }
    }
  }, []);

  /* affiche les informations du compte */
  useEffect(() => {
    const fetchUser = async () => {
      const token = localStorage.getItem('jwt');
      if (!token) return;
      const decoded = JSON.parse(atob(token.split('.')[1]));
      const response = await fetch(`/api/acount?id=${decoded.id}`, { method: 'GET' });
      const result = await response.json();
      setUser(result.data); // result.data doit contenir { admin: true/false, ... }
    };
    fetchUser();
  }, []);


  const downloadCSV = () => {
    const header = ["Date", "Utilisateur", "Titre", "Quantité"];
    const rows = historique.map(item => [
      item.date_reception,
      item.name_user,
      item.livre_title,
      item.quantite
    ]);
    const csvContent = [header, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "resception.csv";
    link.click();
    setTimeout(() => window.URL.revokeObjectURL(url), 100);
  };

  const rows = inventaire.map((item) => (
    <Table.Tr key={item.id}>
    <Table.Td>{item.title}</Table.Td>
      <Table.Td>{item.author}</Table.Td>
      <Table.Td>{item.quantite}</Table.Td>
      <Table.Td>{item.price} €</Table.Td>      
      <Table.Td>{item.isbn}</Table.Td>
      <Table.Td>
        <span style={{ color: item.quantite > 0 ? '#228B22' : 'red', fontWeight: 600 }}>
          {item.quantite > 0 ? 'EN STOCK' : 'RUPTURE'}
        </span>
      </Table.Td>
    </Table.Tr>
  ));

  return (
    <div className={styles.bgGradient}>
      <Paper shadow="xl" radius="lg" p="xl" withBorder className={styles.cardTable}>
        <div className={styles.headerRow}>
          <Title order={1} mb="lg" ta="center" className={styles.title}>
            <IconBook size={32} style={{ verticalAlign: 'middle', marginRight: 8 }} />
            Livres en stock
          </Title>
          <div className={styles.actions}>
            
            {user?.admin === true && (
              <Link href="/inventaire/ScannerResception" passHref legacyBehavior>
                <Button
                  color="violet"
                  radius="xl"
                  leftSection={<IconListDetails size={18} />}
                >
                  Accéder à l&apos;ajout de livre
                </Button>
              </Link>
            )}
            <Button              
                color="violet"
                radius="xl"
                leftSection={<IconListDetails size={18} />} onClick={() => setOpened(true)}>Historique</Button>
            </div>
        </div>
        {loading ? (
          <Center>
            <Loader />
          </Center>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <Table
              striped
              highlightOnHover
              withColumnBorders
              className={styles.tableModern}
            >
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>title</Table.Th>
                  <Table.Th>author</Table.Th>
                  <Table.Th>quantité</Table.Th>
                  <Table.Th>prix</Table.Th>
                  <Table.Th>isbn</Table.Th>
                  <Table.Th>statut</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>{rows}</Table.Tbody>
            </Table>
          </div>
        )}
      </Paper>
      <Modal opened={opened} onClose={() => setOpened(false)} size="xl" title="Historique des livres">
        <Button onClick={downloadCSV}>Télécharger en CSV</Button>
        <Table striped highlightOnHover withColumnBorders className={styles.tableModern}>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Date</Table.Th>
              <Table.Th>Quantité</Table.Th>
              <Table.Th>Livre</Table.Th>
              <Table.Th>Utilisateur</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {historique.map((item) => (
              <Table.Tr key={item.id}>
                <Table.Td>{item.date_reception}</Table.Td>
                <Table.Td>{item.quantite}</Table.Td>
                <Table.Td>{item.livre_title}</Table.Td>
                <Table.Td>{item.name_user}</Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Modal>
    </div>
  );
}

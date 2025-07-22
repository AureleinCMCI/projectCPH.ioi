'use client';

import { Badge, Button, Center, Checkbox, Loader, Modal, Paper, Table, Text, TextInput, Title } from '@mantine/core';
import { IconCamera } from '@tabler/icons-react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { jwtDecode } from 'jwt-decode';
import { useCallback, useEffect, useRef, useState } from 'react';
import styles from './style/ScannerResception.module.css';

type InventaireItem = {
  id: number;
  livre_id: number;
  title: string;
  author: string;
  quantite: number;
  price: number;
  isbn: number;
  livre?: { image?: string };
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
  const [popoverOpened, setPopoverOpened] = useState(false);
  const [scannerReady, setScannerReady] = useState(false);
  const scannerRef = useRef<HTMLDivElement | null>(null);
  const [search, setSearch] = useState('');
  const [formOpened, setFormOpened] = useState(false);
  const [isbn, setIsbn] = useState('');
  const [result, setResult] = useState('');
  const [inventaire, setInventaire] = useState<InventaireItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selected, setSelected] = useState<number[]>([]);
  const [supprimer, setSupprimer] = useState<number>(1);
  const [commandeOpened, setCommandeOpened] = useState(false);
  const [commandes, setCommandes] = useState<{ user_id: number; date_achat: string; title: string;quantite: number; vendeur?: string; user?: { name?: string };
  }[]>([]);


  /* Téléchargement du fichier CSV */
  const downloadCSV = () => {
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
  };


  useEffect(() => {
    const fetchCommandes = async () => {
      const response = await fetch('/api/commande', { method: 'GET' });
      const result = await response.json();
      setCommandes(result.data || []);
    };
    fetchCommandes();
  }, []);

  const setScannerNode = useCallback((node: HTMLDivElement | null) => {
    scannerRef.current = node;
    setScannerReady(!!node);
  }, []);

  // Fonction pour demander les permissions de caméra sur Android


  useEffect(() => {
    if (popoverOpened && scannerReady && scannerRef.current) {
      const reader = new BrowserMultiFormatReader();
      
      // Créer un élément vidéo pour le scanner
      const videoElement = document.createElement('video');
      videoElement.style.width = '100%';
      videoElement.style.height = '300px';
      videoElement.style.borderRadius = '8px';
      
      if (scannerRef.current) {
        scannerRef.current.innerHTML = '';
        scannerRef.current.appendChild(videoElement);
      }
      
      // Démarrer le scanner
      reader.decodeFromVideoDevice(
        undefined, // Caméra par défaut
        videoElement,
        (result, err) => {
          if (result) {
            console.log('ISBN détecté (ZXing):', result.getText());
            setResult(result.getText());
            setIsbn(result.getText());
          }
          if (err && err.name !== 'NotFoundException') {
            console.error('Erreur scanner ZXing:', err);
          }
        }
      );

      return () => {
        // Nettoyage automatique
      };
    }
  }, [popoverOpened, scannerReady]);

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

  const filteredInventaire = inventaire.filter((item) =>
    (item.title ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (item.author ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const decrementInventaire = async (livre: InventaireItem, quantite: number) => {
    if (!quantite || quantite <= 0) {
      alert("Veuillez saisir une quantité à supprimer supérieure à 0.");
      return;
    }
    if (livre.quantite <= 0) {
      alert("Ce livre n'est pas en stock !");
      return;
    }
    if (quantite > livre.quantite) {
      alert("La quantité à supprimer est supérieure à la quantité en stock !");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch('/api/ScannerResception', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: livre.id, supprimer: quantite, isbn: livre.isbn }),
      });

      if (!res.ok) throw new Error('Erreur lors de la décrémentation');

      const response = await fetch('/api/inventaire', { method: 'GET' });
      const result = await response.json();
      setInventaire(result.data || []);
      setLoading(false);
      alert(`Quantité du livre "${livre.title}" décrémentée de ${quantite} !`);
      setFormOpened(false);
      setSupprimer(1);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('Erreur:', message);
      setLoading(false);
      alert('Erreur lors de la décrémentation');
    }
  };

  const ajouterCommande = async (livre: InventaireItem, quantite: number) => {
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

  return (
    <div className={styles.bgGradient}>
      <Paper shadow="xl" radius="lg" p="xl" withBorder className={styles.cardTable}>
        <div className={styles.headerRow}>
          <Title order={2} className={styles.title}>Liste des livres</Title>
          <div className={styles.actions}>
            <Button 
              color="blue" 
              radius="xl" 
              onClick={() => setPopoverOpened(true)} 
              leftSection={<IconCamera size={18} />}
            >
              Scanner ISBN
            </Button>
            <Button onClick={() => setCommandeOpened(true)}>Commandes</Button>
          </div>
        </div>
          <Modal opened={commandeOpened} onClose={() => setCommandeOpened(false)} title="Commandes"  centered  size="xxl" >
          <Button onClick={downloadCSV}>Télécharger en CSV</Button>
            <div className={styles.tableContainer}>
              <Table.ScrollContainer minWidth={900} type="native">
                <Table  striped  highlightOnHover  withColumnBorders  className={styles.tableModern} >
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
        <TextInput
          className={styles.searchInput}
          placeholder="Rechercher par titre ou auteur..."
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
          leftSection={<IconCamera size={18} />}
          mb="md"
        />

        {loading ? (
          <Center>
            <Loader />
          </Center>
        ) : (
          <div className={styles.tableContainer}>
            <Table.ScrollContainer minWidth={900} type="native">
              <Table className={styles.tableModern}>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Sélectionner</Table.Th>
                    <Table.Th>Titre</Table.Th>
                    <Table.Th>ID Livre</Table.Th>
                    <Table.Th>Auteur</Table.Th>
                    <Table.Th>Quantité</Table.Th>
                    <Table.Th>Prix</Table.Th>
                    <Table.Th>ISBN</Table.Th>
                    <Table.Th>État</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {filteredInventaire.map((item) => (
                    <Table.Tr key={item.id}>
                      <Table.Td>
                        <Checkbox
                          checked={selected.includes(item.id)}
                          onChange={() => setSelected((prev) => prev.includes(item.id) ? prev.filter((i) => i !== item.id) : [...prev, item.id])}
                        />
                      </Table.Td>
                      <Table.Td>{item.title}</Table.Td>
                      <Table.Td>{item.livre_id}</Table.Td>
                      <Table.Td>{item.author}</Table.Td>
                      <Table.Td>{item.quantite}</Table.Td>
                      <Table.Td>{item.price} €</Table.Td>
                      <Table.Td>{item.isbn}</Table.Td>
                      <Table.Td>
                        <Badge color={item.quantite > 5 ? 'green' : item.quantite > 0 ? 'yellow' : 'red'} variant="light" radius="sm">
                          {item.quantite > 5 ? 'En stock' : item.quantite > 0 ? 'Faible' : 'Rupture'}
                        </Badge>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Table.ScrollContainer>
          </div>
        )}
      </Paper>

      {/* Scanner ISBN */}
      {popoverOpened && (
        <Modal opened={popoverOpened} onClose={() => setPopoverOpened(false)} title="Scanner ISBN" centered size="md">
          <div ref={setScannerNode} style={{ width: '100%', maxWidth: 350, height: 250, margin: '0 auto', borderRadius: 8, overflow: 'hidden', background: '#000' }} />
          <Text mt="sm" color="blue">
            {result ? `ISBN détecté : ${result}` : 'Scanne un code-barres ISBN de livre'}
          </Text>
          <TextInput label="ISBN" name="isbn" value={isbn} onChange={e => setIsbn(e.target.value)} placeholder="Scanné ou à saisir manuellement" mt="md" />
          <Center>
            <Button onClick={() => {
              setPopoverOpened(false);
              setFormOpened(true);
            }} disabled={!isbn}>
              Valider
            </Button>
          </Center>
        </Modal>
      )}

      {/* Affichage du tableau des commandes ici */}
      {/* Infos du livre scanné */}
      <Modal opened={formOpened} onClose={() => { setFormOpened(false); setSupprimer(1); }} title="Informations du livre" centered size="md">
        {(() => {
          const livre = inventaire.find(item => item.isbn.toString() === isbn.trim());
          if (isbn && !livre) {
            return <Text color="red" ta="center" size="lg" my="xl">Livre pas en stock !</Text>;
          }
          if (livre) {
            return (
              <div style={{ width: 400, maxWidth: '90vw', margin: '0 auto' }}>
                <TextInput label="Vendeur" value={user?.name || ''} readOnly mb="md" />
                <TextInput label="ISBN" value={livre.isbn} readOnly mb="md" />
                <TextInput label="Titre du livre" value={livre.title} readOnly mb="md" />
                <TextInput label="Auteur" value={livre.author} readOnly mb="md" />
                <TextInput label="Prix" value={livre.price} readOnly mb="md" />
                <TextInput label="Quantité en stock" value={livre.quantite} readOnly mb="md" />
                <TextInput
                  label="Quantité à retirer"
                  type="number"
                  min={1}
                  max={livre.quantite}
                  value={supprimer}
                  onChange={e => setSupprimer(Number(e.target.value))}
                  mb="md"
                />
                <Button
                  mt="md"
                  onClick={async () => {
                    await decrementInventaire(livre, supprimer);
                    await ajouterCommande(livre, supprimer);
                  }}
                >
                  Valider la vente
                </Button>
              </div>
            );
          }
          return null;
        })()}
      </Modal>
    </div>
  );
}

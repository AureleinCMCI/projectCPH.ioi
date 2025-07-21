'use client';

import { Badge, Button, Center, Checkbox, Group, Loader, Modal, Paper, Table, Text, Textarea, TextInput, Title } from '@mantine/core';
import { useCallback, useEffect, useRef, useState } from 'react';


import Quagga, { QuaggaJSResultObject } from '@ericblade/quagga2';
import { IconCamera, IconEdit } from '@tabler/icons-react';
import { jwtDecode } from 'jwt-decode';
import styles from './style/ScannerResception.module.css';
type InventaireItem = { id: number; livre_id: number; title: string; author: string; quantite: number; price: number; isbn: number; livre?: { image?: string };};

export default function   Resception() {
  // États pour le formulaire d'ajout
  const [formOpened, setFormOpened] = useState(false);
  const [result, setResult] = useState('');
  const [popoverOpened, setPopoverOpened] = useState(false);
  const [scannerReady, setScannerReady] = useState(false);
  const scannerRef = useRef<HTMLDivElement | null>(null);
  const [search, setSearch] = useState('');

  const [formData, setFormData] = useState({title: '',author: '', price: '', quantite: '', isbn: '', description: '', image: '', livre_id: '', livre_title: '',  name_user: '',   info: '',  user_id: '', date_reception: '',});
  const [inventaire, setInventaire] = useState<InventaireItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const [selected, setSelected] = useState<number[]>([]);

  const [detailsOpened, setDetailsOpened] = useState(false);

  const [ajouts, setAjouts] = useState<{ [id: number]: number }>({});

  const [editedBooks, setEditedBooks] = useState<InventaireItem[]>([]);

  const setScannerNode = useCallback((node: HTMLDivElement | null) => {
    scannerRef.current = node;
    setScannerReady(!!node);
  }, []);

  // Initialisation Quagga seulement quand le conteneur est prêt
  useEffect(() => {
    if (popoverOpened && scannerReady && scannerRef.current) {
      Quagga.init({
        inputStream: {
          type: "LiveStream",
          target: scannerRef.current,
          constraints: { facingMode: "environment" },
        },
        decoder: { readers: ["ean_reader"] },
      }, (err) => {
        if (!err) Quagga.start();
      });

      const onDetected = (data: QuaggaJSResultObject) => {
        if (data?.codeResult?.code) {
          setResult(data.codeResult.code);
          setFormData((prev) => ({
            ...prev,
            isbn: data.codeResult.code ?? '',
          }));
        }
      };
      Quagga.onDetected(onDetected);

      return () => {
        Quagga.stop();
        Quagga.offDetected(onDetected);
      };
    }
  }, [popoverOpened, scannerReady]);

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

  const handleCheckbox = (id: number) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSubmit = (element: React.FormEvent) => {
    element.preventDefault();
    // Récupère les livres sélectionnés
    const books = filteredInventaire.filter(item => selected.includes(item.id));
    //setSelectedBooks(books);

    // Copie pour édition locale de l'ISBN
    setEditedBooks(books.map(book => ({ ...book })));

    // Réinitialise les ajouts à 0 pour chaque livre sélectionné
    const initialAjouts: { [id: number]: number } = {};
    books.forEach(book => {
      initialAjouts[book.id] = 0;
    });
    setAjouts(initialAjouts);

    setDetailsOpened(true);
    setSelected([]);
  };

  // Gestion du changement de la quantité à ajouter
  const handleAjoutChange = (id: number, value: string) => {
    setAjouts(prev => ({
      ...prev,
      [id]: Number(value)
    }));
  };

  // Gestion du changement de l'ISBN
  const handleIsbnChange = (id: number, newIsbn: string) => {
    setEditedBooks(prev =>
      prev.map(book =>
        book.id === id ? { ...book, isbn: Number(newIsbn) } : book
      )
    );
  };

  // Fonction pour incrémenter la quantité (utilise editedBooks pour l'ISBN modifié)
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
          livre_title: livre.title, // ici, on s'assure que c'est bien envoyé
          info: 0 // ou une info pertinente
        }),
      });


      // Rafraîchir l'inventaire
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
  const updateIsbn = async (id: number, livre_id: number, newIsbn: number, oldIsbn: number) => {
    try {
      const res = await fetch('/api/ScannerResception', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, livre_id, newIsbn, oldIsbn }),
      });
      if (!res.ok) throw new Error('Erreur lors de la mise à jour de l\'ISBN');
      alert('ISBN mis à jour avec succès !');
    } catch (err) {
      console.error('Erreur:', err);
      alert('Erreur lors de la mise à jour de l\'ISBN');
    }
  };
  // Filtrage de l'inventaire selon la recherche
  const filteredInventaire = inventaire.filter((item) =>
    (item.title ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (item.author ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const [showCamera, setShowCamera] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [capturedImage, setCapturedImage] = useState('');
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');

  // Ajoute la logique pour démarrer la caméra
  useEffect(() => {
    if (showCamera && videoRef.current) {
      navigator.mediaDevices.getUserMedia({ video: { facingMode } }).then(stream => {
        if (videoRef.current) videoRef.current.srcObject = stream;
      });
    }
    // Copie la référence dans une variable locale
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
    // Arrêter la caméra
    if (video.srcObject) {
      (video.srcObject as MediaStream).getTracks().forEach(track => track.stop());
    }
  };
  /* User connecté*/

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
    <div className={styles.bgGradient}>
      <Paper shadow="xl" radius="lg" p="xl" withBorder className={styles.cardTable}>
        <div className={styles.headerRow}>
          <Title order={2} className={styles.title}>Liste des livres</Title>
          <div className={styles.actions}>
            <Button color="violet" radius="xl" onClick={() => setPopoverOpened(true)}>+ Ajouter un livre</Button>
            <Button variant="outline" color="gray" radius="xl">Exporter</Button>
          </div>
        </div>
        <TextInput  className={styles.searchInput}  placeholder="Rechercher par titre ou auteur..."  value={search}  onChange={(e) => setSearch(e.currentTarget.value)}      leftSection={<IconCamera size={18} />}       mb="md"    />
        {loading ? (
          <Center>
            <Loader />
          </Center>
        ) : (
          <>
          <div className={styles.tableContainer}>
            <Table.ScrollContainer minWidth={900} type="native">
              <Table striped highlightOnHover withColumnBorders className={styles.tableModern}>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Sélectionner</Table.Th>
                    <Table.Th>Image</Table.Th>
                    <Table.Th>Titre</Table.Th>
                    <Table.Th>Auteur</Table.Th>
                    <Table.Th>Quantité</Table.Th>
                    <Table.Th>Prix</Table.Th>
                    <Table.Th>ISBN</Table.Th>
                    <Table.Th>Statut</Table.Th>
                    <Table.Th>Actions</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {filteredInventaire.map((item) => (
                    <Table.Tr key={item.id}>
                      <Table.Td>
                        <Checkbox
                          checked={selected.includes(item.id)}
                          onChange={() => handleCheckbox(item.id)}
                        />
                      </Table.Td>
                      <Table.Td>
                        {item.livre?.image ? (
                          <img src={item.livre.image} alt="Livre" style={{ width: 40, height: 56, objectFit: 'cover', borderRadius: 6, boxShadow: '0 2px 8px #0001' }} />
                        ) : (
                          <span style={{ color: '#aaa', fontSize: 12 }}>Aucune</span>
                        )}
                      </Table.Td>
                      <Table.Td>{item.title}</Table.Td>
                      <Table.Td>{item.author}</Table.Td>
                      <Table.Td>
                        <Badge color={item.quantite > 5 ? 'green' : item.quantite > 0 ? 'yellow' : 'red'} variant="light" radius="sm">
                          {item.quantite}
                        </Badge>
                      </Table.Td>
                      <Table.Td>{item.price} €</Table.Td>
                      <Table.Td>{item.isbn}</Table.Td>
                      <Table.Td>
                        <Badge color={item.quantite > 5 ? 'green' : item.quantite > 0 ? 'yellow' : 'red'} variant="light" radius="sm">
                          {item.quantite > 5 ? 'En stock' : item.quantite > 0 ? 'Faible' : 'Rupture'}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <Button variant="subtle" color="gray" radius="xl" size="xs" onClick={() => setSelected([item.id])}>...</Button>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Table.ScrollContainer>
            </div>
            {selected.length > 0 && (
              <Text mt="md" color="teal">
                Livres sélectionnés : {selected.join(', ')}
              </Text>
            )}

            <Group justify="center" mt="md">
              <Button type="button" disabled={selected.length === 0} onClick={handleSubmit}>
                Valider la sélection
              </Button>
            </Group>
          </>
        )}
      </Paper>
      {popoverOpened && (
        <Modal opened={popoverOpened} onClose={() => setPopoverOpened(false)} title="Scanner ISBN" centered size="md">
          <div ref={setScannerNode} style={{ width: '100%', maxWidth: 350, height: 250, margin: '0 auto', borderRadius: 8, overflow: 'hidden', background: '#000' }} />
          <Text mt="sm" color="blue">
            {result ? `ISBN détecté : ${result}` : 'Scanne un code-barres ISBN de livre'}
          </Text>
          <TextInput label="ISBN" name="isbn" value={formData.isbn} onChange={handleFormChange} placeholder="Scanné ou à saisir manuellement" mt="md" />
          <Center>
            <Button
              onClick={() => {
                setPopoverOpened(false);
                setFormOpened(true);
              }}
              disabled={!formData.isbn}
            >
              Valider
            </Button>
          </Center>
        </Modal>
      )}
      <Modal opened={formOpened} onClose={() => setFormOpened(false)}  title="Ajouter ou incrémenter un livre" centered  size="xl" >
        <form onSubmit={handleFormSubmit} style={{ width: '600px', maxWidth: '90vw', margin: '0 auto' }}>
          <TextInput label="ISBN" name="isbn" value={formData.isbn} onChange={handleFormChange} required mb="md"/>
          <TextInput label="Titre du livre" name="title"  value={formData.title} onChange={handleFormChange}  required  mb="md" />
          <TextInput label="Auteur" name="author" value={formData.author}  onChange={handleFormChange} required mb="md" />
          <Textarea label="Description" name="description"  value={formData.description} onChange={handleFormChange}  minRows={2}  mb="md"  />
          <TextInput  label="Prix"  name="price"  value={formData.price}  onChange={handleFormChange}  required  mb="md"  />
          <TextInput  label="Quantité"  name="quantite"  value={formData.quantite}  onChange={handleFormChange}  required  mb="md"/>
          <Button mt="md" onClick={e => { e.preventDefault(); setShowCamera(true); }}>
            Prendre une photo
          </Button>
          {showCamera && (
            <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <video ref={videoRef} autoPlay style={{ width: 320, height: 240, borderRadius: 12, background: '#000' }} />
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: 16, gap: 24 }}>
                <Button variant="outline" color="gray"  radius="xl" size="md" style={{ width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={e => { e.preventDefault(); setFacingMode(facingMode === 'user' ? 'environment' : 'user'); }}  title="Retourner la caméra" >
                  {facingMode === 'user' ? '🔄 Arrière' : '🔄 Avant'}
                </Button>
                <Button   color="teal" radius="xl" size="xl"  style={{ width: 64, height: 64, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, boxShadow: '0 2px 8px #0002' }} onClick={e => { e.preventDefault(); handleCapture(); }}  title="Prendre la photo"  >
                  📸
                </Button>
                <Button color="red"radius="xl"   size="md"  style={{ width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={e => { e.preventDefault(); setShowCamera(false); }}   title="Annuler"   >
                  ✖
                </Button>
              </div>
            </div>
          )}
          {/* Aperçu de la photo capturée */}
          {capturedImage && (
            <div style={{ marginTop: 10 }}>
              <Text size="sm" color="dimmed" mb="xs">Aperçu de la photo :</Text>
              <img src={capturedImage} alt="Aperçu" style={{ width: 150, borderRadius: 8 }} />
            </div>
          )}
          <Center h={100}>
            <Button mt="md" type="submit">Ajouter / Incrémenter</Button>
          </Center>
        </form>
      </Modal>
      <Modal   opened={detailsOpened}  onClose={() => setDetailsOpened(false)}   title="Informations du ou des livres sélectionnés"  size="xl"  centered >
        {editedBooks.length === 0 ? (
          <Text>Aucun livre sélectionné.</Text>
        ) : (
          editedBooks.map(book => (
            <Paper key={book.id} shadow="xs" p="md" mb="md" withBorder>
              <TextInput label="Titre" value={book.title}   readOnly mb="md" />
              <TextInput label="Auteur" value={book.author} readOnly mb="md" />
             <Group gap="xs" mb="md">
                <TextInput  label="ISBN"  value={book.isbn.toString()}  onChange={e => handleIsbnChange(book.id, e.target.value)} style={{ flex: 1 }} />
                <Button variant="subtle" color="blue" onClick={() => updateIsbn(book.id, book.livre_id, Number(book.isbn), book.isbn)}title="Mettre à jour l'ISBN" px={6} >
                  <IconEdit size={20} />
                </Button>
              </Group>
              <TextInput label="Quantité" value={book.quantite} readOnly mb="md" />
              <TextInput label="Prix" value={book.price.toString()} readOnly mb="md" />
              <TextInput label="Quantité à ajouter" type="number"value={ajouts[book.id] ?? ''}onChange={e => handleAjoutChange(book.id, e.target.value)} mb="md"min={1} />
              <Button  mt="md"onClick={() => incrementInventaire(book, ajouts[book.id] || 0)}>
                Valider (incrémenter la quantité)
              </Button>
            </Paper>
          ))
        )}
      </Modal>
    </div>
  );
}

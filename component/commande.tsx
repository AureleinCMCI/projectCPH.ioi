'use client';

import Quagga, { QuaggaJSResultCallbackFunction, QuaggaJSResultObject } from '@ericblade/quagga2';
import { Button, Center, Loader, Modal, Table, Text, TextInput } from '@mantine/core';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { jwtDecode } from 'jwt-decode';
import { useCallback, useEffect, useRef, useState } from 'react';
import styles from './style/ScannerResception.module.css';
import stylesCompte from './style/monCompte.module.css';

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
  const [loading, setLoading] = useState<boolean>(true);
  const [supprimer, setSupprimer] = useState<number>(1);
  const [commandeOpened, setCommandeOpened] = useState(false);
  const [commandes, setCommandes] = useState<{ user_id: number; date_achat: string; title: string;quantite: number; vendeur?: string; user?: { name?: string };
  }[]>([]);
  const [isMobile, setIsMobile] = useState(false); // Détection mobile
  const [scanner, setScanner] = useState<Html5QrcodeScanner | boolean | null>(null);
  const [scannerType, setScannerType] = useState<'html5' | 'quagga'>('html5');
  const [showCodesList, setShowCodesList] = useState(false);
  const [scannedCodes, setScannedCodes] = useState<string[]>([]);
  const [isbnList, setIsbnList] = useState<{ isbn: number; livre_id: number }[]>([]);
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


  const handleScan = (decodedText: string) => {
    if (decodedText) {
      console.log('✅ Code scanné:', decodedText);
      setIsbn(decodedText);
      
      // Ajouter le code à la liste s'il n'y est pas déjà
      setScannedCodes(prev => {
        if (!prev.includes(decodedText)) {
          const newCodes = [...prev, decodedText];
          console.log('📋 Codes scannés:', newCodes);
          setShowCodesList(true);
          return newCodes;
        }
        return prev;
      });

      // Vérifier si l'ISBN existe dans la liste des ISBN
      const isbnTrouve = isbnList.find(item => item.isbn.toString() === decodedText.trim());
      
      if (isbnTrouve) {
        // ISBN trouvé - chercher le livre correspondant dans l'inventaire
        const livre = inventaire.find(item => item.livre_id === isbnTrouve.livre_id);
        
        if (livre) {
          console.log(`✅ ISBN trouvé : ${livre.title} (ISBN: ${isbnTrouve.isbn})`);
        } else {
          console.log(`✅ ISBN trouvé mais livre non en stock : ${isbnTrouve.isbn}`);
        }
      } else {
        // ISBN non trouvé
        console.log(`❌ ISBN non trouvé : ${decodedText}`);
      }
    }
  };

  const handleError = (errorMessage: string) => {
    console.error('Erreur de scan:', errorMessage);
  };

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
        // IOS : QuaggaJS
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
              "codabar_reader"
            ]
          },
          locate: false,
          locator: {
            patchSize: "large",
            halfSample: true
          },
          numOfWorkers: 2,
          frequency: 10,
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

  // Nettoyage quand le scanner se ferme
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

  // Diagnostic quand le scanner s'ouvre
  useEffect(() => {
    if (scannerOpened) {
      console.log('🎯 Scanner ouvert - diagnostic en cours...');
      checkCompatibility();
    }
  }, [scannerOpened]);

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

  const validateAllScannedCodes = () => {
    console.log('🔍 Vérification de tous les codes scannés...', scannedCodes);
    
    // Chercher si AU MOINS UN ISBN existe dans la base de données
    let livreFound = null;
    
    for (const code of scannedCodes) {
      // Vérifier si l'ISBN existe dans la liste des ISBN
      const isbnTrouve = isbnList.find(item => item.isbn.toString() === code.trim());
      
      if (isbnTrouve) {
        // ISBN trouvé - chercher le livre correspondant dans l'inventaire
        const livre = inventaire.find(item => item.livre_id === isbnTrouve.livre_id);
        
        if (livre) {
          livreFound = livre;
          break; // Arrêter dès qu'on trouve un match
        }
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
      // ✅ ISBN trouvé : ouvrir le formulaire de décrémentation
      alert(`✅ Livre trouvé : ${livreFound.title}`);
      setIsbn(livreFound.isbn.toString());
      setSupprimer(1); // Initialiser la quantité à décrémenter
      setTimeout(() => setFormOpened(true), 500); // Ouvre le formulaire de décrémentation
    } else {
      // ❌ ISBN non trouvé
      alert(`❌ Aucun livre trouvé en stock`);
    }
  };

  return (
    <div className={stylesCompte.revolutStyle}>
      {/* Header avec icône livre */}


      {/* Section montant principal */}
      <div className={stylesCompte.revolutAmount}>
        <div className={stylesCompte.revolutLabel}>Commandes</div>
        <div className={stylesCompte.revolutValue}>{commandes.length}</div>
        <div className={stylesCompte.revolutQuickActions}>
          <div className={stylesCompte.quickAction}>
            <div onClick={() => setScannerOpened(true)} className={stylesCompte.revolutdiv}>
              <span>📱</span>
              <div className={stylesCompte.quickActionLabel}>Scanner</div>
            </div>
          </div>

          <div className={stylesCompte.quickAction}>
          <div onClick={() => setScannerOpened(true)} className={stylesCompte.revolutdiv}>
              <span>📋</span>
              <div className={stylesCompte.quickActionLabel}>Commande</div>
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
          className={stylesCompte.searchInput}
        />
      </div>

      {/* Liste des livres */}
      <div className={stylesCompte.transactionsList}>
        {loading ? (
          <Center>
            <Loader />
          </Center>
        ) : (
          filteredInventaire.map((item) => (
            <div key={item.id} className={stylesCompte.transaction}>
              <div className={stylesCompte.transactionIcon}>📚</div>
              <div className={stylesCompte.transactionInfo}>
                <div className={stylesCompte.transactionTitle}>{item.title}</div>
                <div className={stylesCompte.transactionTime}>
                  👤 {item.author} | 📖 ISBN: {item.isbn}
                </div>
              </div>
              <div className={stylesCompte.transactionAmount}>
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

      {/* Scanner en DIV plein écran */}
      {scannerOpened && (
        <div className={styles.scannerFullScreen}>
          {/* Header avec bouton fermer */}
          <div className={styles.scannerHeader}>
            <Text className={styles.scannerTitle}>
              📱 Scanner ISBN
            </Text>
            <div onClick={() => setScannerOpened(false)} className={styles.scannerCloseButton} style={{ marginTop: '100px' }}>
              ✕ Fermer
            </div>
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
                  placeholder="Saisir ISBN manuellement"
                  value={isbn}
                  onChange={(e) => setIsbn(e.currentTarget.value)}
                  style={{ flex: 1 }}
                  styles={{
                    input: { 
                      backgroundColor: 'white', 
                      color: 'black',
                      fontSize: '14px'
                    }
                  }}
                />
                <Button
                  size="sm"
                  color="green"
                  onClick={async () => {
                    if (isbn.trim()) {
                      // Vérifier si l'ISBN existe dans la liste des ISBN
                      const isbnTrouve = isbnList.find(item => item.isbn.toString() === isbn.trim());
                      
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
                        alert(`❌ ISBN non trouvé : ${isbn}`);
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
        </div>
      )}

      {/* Modal des commandes */}
      <Modal opened={commandeOpened} onClose={() => setCommandeOpened(false)} title="Commandes" centered size="xxl">
        <Button onClick={downloadCSV}>Télécharger en CSV</Button>
        <div className={styles.tableContainer}>
          <Table.ScrollContainer minWidth={900} type="native">
            <Table striped highlightOnHover withColumnBorders className={styles.tableModern}>
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
            return <Text color="red" ta="center" size="lg" my="xl">Livre pas en stock !</Text>;
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
                <Button
                  mt="md"
                  onClick={async () => {
                    await decrementInventaire(livre, supprimer);
                    await ajouterCommande(livre, supprimer);
                  }}
                  className={isMobile ? styles.iosModalButton : ''}
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
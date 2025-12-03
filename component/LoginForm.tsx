'use client';

import { useRouter } from 'next/navigation';
import React, { ChangeEvent, FormEvent, useState, useEffect, useRef } from 'react';
import {Image, } from '@mantine/core';

import style from './style/login.module.css';


export const LoginForm: React.FC = () => {
  // États pour le formulaire de connexion
  const [name, setName] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [message, setMessage] = useState<string>('');

  // États pour le formulaire d'inscription
  const [signupName, setSignupName] = useState<string>('');
  const [signupPassword, setSignupPassword] = useState<string>('');

  // États pour la modale de changement de mot de passe
  const [passwordModalOpen, setPasswordModalOpen] = useState<boolean>(false);
  const [username, setUsername] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [passwordMessage, setPasswordMessage] = useState<string>('');

  // État pour l'animation du container
  const [rightPanelActive, setRightPanelActive] = useState<boolean>(false);

  // Pour la navigation
  const router = useRouter();

  // État pour l'écran de bienvenue
  const [showWelcome, setShowWelcome] = useState(true);

  // État pour gérer la navigation
  const [isNavigating, setIsNavigating] = useState<boolean>(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Après 3 secondes, masquer l'écran de bienvenue
    const timer = setTimeout(() => {
      setShowWelcome(false);
    }, 3000);
    
    return () => clearTimeout(timer);
  }, []);

  // Option A: navigation after timeout (simple)
  // Option B (recommended): navigation after animationend event
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const onAnimEnd = (e: AnimationEvent) => {
      // ensure we only navigate when exit animation finished
      if (isNavigating) {
        router.push('/acceuil');
      }
    };
    el.addEventListener('animationend', onAnimEnd as EventListener);
    return () => el.removeEventListener('animationend', onAnimEnd as EventListener);
  }, [isNavigating, router]);

  // Gestion du submit (connexion)
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, password }),
      });

      const data = await res.json();
      setMessage(data.message);

      if (name === '' && password === '') {
        setMessage('Veuillez entrer un nom et un mot de passe');
        return;
      }
      else if (res.ok && data.success) {
        if (data.token) {
          localStorage.setItem('jwt', data.token);
        }

        // Start exit animation, navigation will occur on animationend
        setIsNavigating(true);

        // Fallback: if animationend doesn't fire, navigate after timeout matching animation duration
        setTimeout(() => {
          // safety: only push if still flagged navigating (prevents double push)
          if (isNavigating) router.push('/acceuil');
        }, 900); // must be >= animation duration (700ms for flip)
      } else {
        setMessage(data.error || 'Erreur de connexion');
      }
    } catch (err: unknown) {
      if (err instanceof Error) setMessage(err.message);
      else setMessage('Erreur lors de la connexion');
    }
  };


  // Gestion du submit (inscription)
  const handleSignUp = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: signupName,
          password: signupPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur lors de l\'inscription');
      setMessage('Inscription réussie ! Connecte-toi');
      setRightPanelActive(false); // Retourne au formulaire de connexion
    } catch (err: unknown) {
      if (err instanceof Error) {
        setMessage(err.message);
      } else {
        setMessage('Erreur lors de l\'inscription');
      }
    }
  };

  // Gestion du changement de mot de passe
  const handlePasswordChange = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Validation
    if (!username || !newPassword || !confirmPassword) {
      setPasswordMessage('Veuillez remplir tous les champs');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setPasswordMessage('Les mots de passe ne correspondent pas');
      return;
    }
    
    if (newPassword.length < 6) {
      setPasswordMessage('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    try {
      const res = await fetch('/api/signup', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: username,
          password: newPassword,
        }),
      });

      let data;
      try {
        data = await res.json();
      } catch (jsonError) {
        console.error('Erreur parsing JSON:', jsonError);
        setPasswordMessage('Erreur de communication avec le serveur');
        return;
      }
      
      if (res.ok && data.success) {
        setPasswordMessage('Mot de passe modifié avec succès !');
        setUsername('');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => {
          setPasswordModalOpen(false);
          setPasswordMessage('');
        }, 2000);
      } else {
        setPasswordMessage(data.error || 'Erreur lors du changement de mot de passe');
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setPasswordMessage(err.message);
      } else {
        setPasswordMessage('Erreur lors du changement de mot de passe');
      }
    }
  };
  
  return (
    <div
      ref={rootRef}
      className={
        `${style.formRoot} ${isNavigating ? style.pageFade /* or style.pageFlip */ : ''}`
      }
    >
      {/* Écran de bienvenue */}
      {showWelcome && (
        <div className={style.welcomeScreen}>
          <div className={style.welcomeContent}>
            <h1 className={style.welcomeTitle}>BIENVENUE</h1>
            <h2 className={style.welcomeSubtitle}>MEMBRE DU CPH </h2>
            <div className={style.welcomeIcon}><Image loading="lazy" src="/zacharias-tanee-fomum.jpg" alt="Livre du frère Zach" style={{ width: '250px', height: '250px',  ojectFit: 'cover', boxShadow: '0 4px 50% rgba(0,0,0,0.3)' }} /></div>
          </div>
        </div>
      )}
      
      {/* Petites étoiles filantes */}
      <span className={style.shootingStar1}></span>
      <span className={style.shootingStar2}></span>
      <span className={style.shootingStar3}></span>
      <span className={style.shootingStar4}></span>
      <span className={style.shootingStar5}></span>
      <span className={style.shootingStar6}></span>
      <span className={style.diamondStar1}></span>
      <div className={`${style.container} ${rightPanelActive ? style.rightPanelActive : ''}`}>
        {/* Sign Up */}
        <div className={style.formContainer + ' ' + style.signUpContainer}>
          <form className={style.form} onSubmit={handleSignUp}>
            <h1 className={style.formTitle}>Créer un compte</h1>
            <div className={style.socialContainer}>
            </div>
            <span className={style.formSpan}> utilisez votre prenom  pour l&apos;inscription</span>
            <input
              className={style.formInput}
              type="text"
              placeholder="Prenom"
              value={signupName}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setSignupName(e.target.value)}
            />
            <input
              className={style.formInput}
              type="password"
              placeholder="Mot de passe"
              value={signupPassword}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setSignupPassword(e.target.value)}
            />
            <button className={style.formButton} type="submit">Sign Up</button>
            {message && <p className={style.formText}>{message}</p>}
          </form>
        </div>

        {/* Sign In */}
        <div className={style.formContainer + ' ' + style.signInContainer}>
          {/* 📚 LIVRES QUI TOMBENT DU CIEL (synchronisés avec le volcan) */}
          <form className={style.form} onSubmit={handleSubmit}>
            <h1 className={style.formTitle}>Bienvenue</h1>
            <span className={style.formSpan}>connectez-vous pour continuer</span>
            <input
              className={style.formInput}
              type="text"
              placeholder="Name"
              value={name}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
            />
            <input
              className={style.formInput}
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
            />
            <a 
              className={style.formLink} 
              href="#" 
              onClick={(e) => {
                e.preventDefault();
                setPasswordModalOpen(true);
              }}
            >
              Mot de passe oublié ?
            </a>
            <button className={style.formButton} type="submit" disabled={isNavigating}>
              Connexion
            </button>
            {message && <p className={style.formText} style={{ color: 'white' }}>{message}</p>}
          </form>
        </div>

        {/* Overlay */}
        <div className={style.overlayContainer}>
          <div className={style.overlay}>
            {/* Panneaux overlay existants */}
            <div className={style.overlayPanel + ' ' + style.overlayLeft}>
              {/* 🌋 LIVRES VOLCANIQUES - DÉPLACÉS ICI */}
              {/* ... tous les autres volcanBook ... */}

              {/* Contenu texte du panneau */}
              <h1 className={style.formTitle}>Bienvenue à vous</h1>
              <p className={style.formText}>Pour rester connecté avec nous, veuillez vous connecter avec vos informations personnelles</p>
              <button className={`${style.formButton} ${style.ghost}`} id="signIn" type="button" onClick={() => setRightPanelActive(false)}>
                Sign In
              </button>
            </div>
            <div className={style.overlayPanel + ' ' + style.overlayRight}>
              <h1 className={style.formTitle}>Bonjour, bien-aimé</h1>
              <p className={style.formText}>crée ton compte avant de débuter</p>
              <button
                className={`${style.formButton} ${style.ghost}`}
                id="signUp"
                type="button"
                onClick={() => setRightPanelActive(true)}
              >
                Sign Up
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modale de changement de mot de passe */}
      {passwordModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '30px',
            borderRadius: '10px',
            width: '400px',
            maxWidth: '90%',
            boxShadow: '0 14px 28px rgba(0,0,0,0.25), 0 10px 10px rgba(0,0,0,0.22)'
          }}>
            <h2 style={{ 
              textAlign: 'center', 
              marginBottom: '20px',
              color: '#333',
              fontFamily: 'Montserrat, sans-serif'
            }}>
              Changer le mot de passe
            </h2>
            
            <form onSubmit={handlePasswordChange}>
              <input
                className={style.formInput}
                type="text"
                placeholder="Nom d'utilisateur"
                value={username}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setUsername(e.target.value)}
                style={{ marginBottom: '15px' }}
              />
              <input
                className={style.formInput}
                type="password"
                placeholder="Nouveau mot de passe"
                value={newPassword}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setNewPassword(e.target.value)}
                style={{ marginBottom: '15px' }}
              />
              <input
                className={style.formInput}
                type="password"
                placeholder="Confirmer le mot de passe"
                value={confirmPassword}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value)}
                style={{ marginBottom: '20px' }}
              />
              
              {passwordMessage && (
                <p style={{ 
                  color: passwordMessage.includes('succès') ? 'green' : 'red',
                  textAlign: 'center',
                  marginBottom: '15px',
                  fontSize: '14px'
                }}>
                  {passwordMessage}
                </p>
              )}
              
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                <button 
                  className={style.formButton} 
                  type="submit"
                  style={{ flex: 1 }}
                >
                  Modifier
                </button>
                <button 
                  className={style.formButton} 
                  type="button"
                  onClick={() => {
                    setPasswordModalOpen(false);
                    setPasswordMessage('');
                    setUsername('');
                    setNewPassword('');
                    setConfirmPassword('');
                  }}
                  style={{ 
                    flex: 1,
                    backgroundColor: '#6c757d',
                    borderColor: '#6c757d'
                  }}
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

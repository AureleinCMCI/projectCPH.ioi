'use client';

import { useRouter } from 'next/navigation';
import React, { ChangeEvent, FormEvent, useState } from 'react';
import Webcam from "react-webcam";
import style from './style/login.module.css';


export const LoginForm: React.FC = () => {
  // États pour le formulaire de connexion
  const [name, setName] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [message, setMessage] = useState<string>('');

  // États pour le formulaire d'inscription
  const [signupName, setSignupName] = useState<string>('');
  const [signupPassword, setSignupPassword] = useState<string>('');

  // État pour l'animation du container
  const [rightPanelActive, setRightPanelActive] = useState<boolean>(false);

  // Pour la navigation
  const router = useRouter();

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
      }
      else if (res.ok && data.success) {
        if (data.token) {
          localStorage.setItem('jwt', data.token);
        }
        router.push('/acceuil');
      } else {
        setMessage(data.error || 'Erreur de connexion');
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setMessage(err.message);
      } else {  
        setMessage('Erreur lors de la connexion');
      }
      setMessage('Erreur lors de la connexion');
    }
    /*si le nom et le mot de passe sont corrects, on redirige vers la page d'accueil*/
  };

  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [showWebcam, setShowWebcam] = useState(false);
  const webcamRef = React.useRef<Webcam>(null);

  const capture = () => {
    if (webcamRef.current) {
      const imageSrc = webcamRef.current.getScreenshot();
      if (imageSrc) {
        setAvatarPreview(imageSrc);
        setShowWebcam(false);
      }
    }
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setAvatarPreview(URL.createObjectURL(e.target.files[0]));
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
          photo: avatarPreview, // base64 ou url
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
  
  return (
    <div className={style.formRoot}>
      <div className={`${style.container} ${rightPanelActive ? style.rightPanelActive : ''}`}>
        <h2 className={style.formSubtitle} style={{ fontWeight: 'bold', marginBottom: 30 }}>
          Weekly Coding Challenge #1: Sign in/up Form
        </h2>
        {/* Sign Up */}
        <div className={style.formContainer + ' ' + style.signUpContainer}>
          <form className={style.form} onSubmit={handleSignUp}>
            <h1 className={style.formTitle}>Create Account</h1>
            <div className={style.socialContainer}>
            </div>
            <span className={style.formSpan}>or use your email for registration</span>
            <div style={{ marginBottom: 16 }}>
              {showWebcam ? (
                <>
                  <Webcam
                    audio={false}
                    ref={webcamRef}
                    screenshotFormat="image/jpeg"
                    videoConstraints={{ facingMode: "user" }}
                    style={{ width: 200, borderRadius: 8 }}
                  />
                  <button type="button" onClick={capture} style={{ margin: 8 }}>Prendre une photo</button>
                  <button type="button" onClick={() => setShowWebcam(false)}>Annuler</button>
                </>
              ) : (
                <>
                  <input
                    type="file"
                    accept="image/*"
                    capture="user"
                    onChange={handleAvatarUpload}
                    style={{ marginBottom: 8 }}
                  />
                  <button type="button" onClick={() => setShowWebcam(true)} style={{ marginLeft: 8 }}>
                    Ouvrir la caméra
                  </button>
                </>
              )}
              {avatarPreview && (
                <img
                  src={avatarPreview}
                  alt="Aperçu avatar"
                  style={{ width: 100, height: 100, borderRadius: "50%", marginTop: 8 }}
                />
              )}
            </div>
            <input
              className={style.formInput}
              type="text"
              placeholder="Name"
              value={signupName}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setSignupName(e.target.value)}
            />
            <input
              className={style.formInput}
              type="password"
              placeholder="Password"
              value={signupPassword}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setSignupPassword(e.target.value)}
            />
            <button className={style.formButton} type="submit">Sign Up</button>
            {message && <p className={style.formText}>{message}</p>}
          </form>
        </div>

        {/* Sign In */}
        <div className={style.formContainer + ' ' + style.signInContainer}>
          <form className={style.form} onSubmit={handleSubmit}>
            <h1 className={style.formTitle}>Sign in</h1>
            <span className={style.formSpan}>or use your account</span>
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
            <a className={style.formLink} href="#">Forgot your password?</a>
            <button className={style.formButton} type="submit">Sign In</button>
            {message && <p className={style.formText}>{message}</p>}
          </form>
        </div>

        {/* Overlay */}
        <div className={style.overlayContainer}>
          <div className={style.overlay}>
            <div className={style.overlayPanel + ' ' + style.overlayLeft}>
              <h1 className={style.formTitle}>Welcome Back!</h1>
              <p className={style.formText}>To keep connected with us please login with your personal info</p>
              <button
                className={`${style.formButton} ${style.ghost}`}
                id="signIn"
                type="button"
                onClick={() => setRightPanelActive(false)}
              >
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
    </div>
  );
};

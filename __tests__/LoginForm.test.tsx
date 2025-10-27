import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { LoginForm } from '../component/LoginForm'

describe('LoginForm', () => {
  it('affiche le formulaire de connexion', () => {
    render(<LoginForm />)
    
    // Vérifie la présence des éléments du formulaire
    expect(screen.getByRole('textbox', { name: /email/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/mot de passe/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /se connecter/i })).toBeInTheDocument()
  })
  
  // Ajoute d'autres tests ici
})
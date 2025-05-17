package main

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/ProtonMail/go-proton-api"
	pjar "github.com/juju/persistent-cookiejar"
	"golang.org/x/net/publicsuffix"
	"golang.org/x/term"

	util "github.com/realalphabet/protonmail-client/internal/client"
	conf "github.com/realalphabet/protonmail-client/internal/config"
	"github.com/realalphabet/protonmail-client/internal/constants"
)

func fatal(err error) {
	fmt.Fprintf(os.Stderr, "%v\n", err)
	os.Exit(1)
}

// promptCaptchaToken demande à l'utilisateur d'entrer le token CAPTCHA
func promptCaptchaToken(webURL string) string {
	fmt.Printf(constants.CaptchaPromptMessage, webURL)
	fmt.Print(constants.CaptchaTokenPrompt)
	var token string
	fmt.Scanln(&token)
	return token
}

// handleLogin gère le processus de connexion avec gestion du CAPTCHA
func handleLogin(ctx context.Context, manager *proton.Manager, username string, password []byte) (*proton.Client, *proton.Auth, error) {
	client, auth, err := manager.NewClientWithLogin(ctx, username, password)

	if err != nil {
		// Vérifie si l'erreur est liée au CAPTCHA
		var apiErr *proton.APIError

		if errors.As(err, &apiErr) && apiErr.Code == constants.CaptchaErrorCode {
			fmt.Println(constants.CaptchaRequiredMessage)

			// Extraire les détails de vérification
			var details struct {
				WebUrl string `json:"WebUrl"`
			}

			if err := json.Unmarshal(apiErr.Details, &details); err != nil {
				return nil, nil, fmt.Errorf("impossible de lire les détails de vérification: %w", err)
			}

			// Demande à l'utilisateur de compléter le CAPTCHA
			token := promptCaptchaToken(details.WebUrl)

			// Réessaie la connexion avec le token CAPTCHA
			client, auth, err = manager.NewClientWithLoginWithHVToken(ctx, username, password, &proton.APIHVDetails{
				Token:   token,
				Methods: []string{constants.VerificationMethodCaptcha},
			})

			if err != nil {
				return nil, nil, fmt.Errorf("erreur lors de la vérification CAPTCHA: %w", err)
			}

			return client, &auth, nil
		}
		return nil, nil, err
	}
	return client, &auth, nil
}

func main() {
	// 1) Configuration du Jar persistant
	jar, err := pjar.New(&pjar.Options{
		Filename:         constants.CookiesFile,
		PublicSuffixList: publicsuffix.List,
	})

	if err != nil {
		fatal(err)
	}

	// 3) Configuration du manager Proton
	manager := proton.New(
		proton.WithAppVersion(constants.AppVersion),
		proton.WithCookieJar(jar),
		proton.WithDebug(constants.DebugEnabled),
	)
	defer manager.Close()

	// 4) Configuration du contexte
	ctx, cancel := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer cancel()

	// 5) Chargement de la configuration
	config, err := conf.LoadConfig()
	if err != nil {
		fatal(err)
	}

	// 6) Connexion au client
	client, auth, err := handleLogin(ctx, manager, config.Username, []byte(config.Password))
	if err != nil {
		fatal(fmt.Errorf("échec de la connexion: %w", err))
	}
	defer client.Close()

	// 6) Gestion de l'authentification 2FA si nécessaire
	if auth.TwoFA.Enabled&proton.HasTOTP != 0 {
		var totpCode string

		if config.TOTPSecretKey != "" {
			// Utilise la clé secrète pour générer le code TOTP
			fmt.Println(constants.TOTPAutoMessage)
			totpCode, err = conf.GenerateTOTPCode(config.TOTPSecretKey)

			if err != nil {
				fatal(err)
			}

		} else {
			// Demande le code manuellement si pas de clé configurée
			if term.IsTerminal(syscall.Stdin) {
				fmt.Print(constants.TOTPPrompt)
			}

			code, err := term.ReadPassword(syscall.Stdin)

			if err != nil {
				fatal(err)
			}

			totpCode = string(code)
		}

		// Authentification avec le code TOTP
		if err := client.Auth2FA(ctx, proton.Auth2FAReq{TwoFactorCode: totpCode}); err != nil {
			fatal(err)
		}
	}

	// 7) Récupération des adresses et clés
	protonAddrs, err := util.GetProtonAddresses(ctx, client, config.Password)
	if err != nil {
		fatal(err)
	}

	// 8) Récupération des derniers messages
	emails, err := client.GetMessageMetadataPage(ctx, 0, 50, proton.MessageFilter{})
	if err != nil {
		fatal(err)
	}

	// Affichage du premier message
	if len(emails) > 0 {
		// Utilise la première adresse pour le déchiffrement
		addrKR := protonAddrs.AddrKRs[protonAddrs.Addrs[0].ID]
		messageContent, err := util.GetDecryptedMessage(ctx, client, emails[0].ID, addrKR)

		if err != nil {
			fatal(err)
		}

		fmt.Println("=== Premier message ===")
		fmt.Println(messageContent)
	}

	// 9) Sauvegarde des cookies avant de démarrer le stream
	if err := jar.Save(); err != nil {
		fatal(err)
	}

	// 10) Démarrage du stream d'événements
	fmt.Println("\n=== Démarrage du stream d'événements ===")
	messageIDs, err := util.StreamMessages(ctx, client, 10*time.Second, 5*time.Second)

	if err != nil {
		fatal(err)
	}

	// Traitement des nouveaux messages
	for messageID := range messageIDs {
		// Utilise la première adresse pour le déchiffrement
		addrKR := protonAddrs.AddrKRs[protonAddrs.Addrs[0].ID]
		messageContent, err := util.GetDecryptedMessage(ctx, client, messageID, addrKR)

		if err != nil {
			fmt.Printf("Erreur lors du déchiffrement du message %s: %v\n", messageID, err)
			continue
		}

		fmt.Printf("\n=== Nouveau message reçu (ID: %s) ===\n", messageID)
		fmt.Println(messageContent)
	}
}

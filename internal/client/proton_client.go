package client

import (
	"context"
	"fmt"
	"runtime"
	"time"

	"github.com/ProtonMail/gluon/async"
	"github.com/ProtonMail/go-proton-api"
	"github.com/ProtonMail/gopenpgp/v2/crypto"
)

type ProtonAddresses struct {
	User    proton.User
	Addrs   []proton.Address
	AddrKRs map[string]*crypto.KeyRing
}

// GetProtonAddresses récupère les informations utilisateur et les adresses déchiffrées
func GetProtonAddresses(ctx context.Context, client *proton.Client, password string) (*ProtonAddresses, error) {
	user, err := client.GetUser(ctx)
	if err != nil {
		return nil, fmt.Errorf("impossible de récupérer l'utilisateur: %w", err)
	}

	addrs, err := client.GetAddresses(ctx)
	if err != nil {
		return nil, fmt.Errorf("impossible de récupérer les adresses: %w", err)
	}

	salts, err := client.GetSalts(ctx)
	if err != nil {
		return nil, fmt.Errorf("impossible de récupérer les salts: %w", err)
	}

	keyPass, err := salts.SaltForKey([]byte(password), user.Keys.Primary().ID)
	if err != nil {
		return nil, fmt.Errorf("impossible de générer la keypass: %w", err)
	}

	_, addrKRs, err := proton.Unlock(user, addrs, keyPass, async.NoopPanicHandler{})
	if err != nil {
		return nil, fmt.Errorf("impossible de déverrouiller les adresses: %w", err)
	}

	return &ProtonAddresses{
		User:    user,
		Addrs:   addrs,
		AddrKRs: addrKRs,
	}, nil
}

// GetDecryptedMessage récupère et déchiffre un message spécifique
func GetDecryptedMessage(ctx context.Context, client *proton.Client, messageID string, addrKR *crypto.KeyRing) (string, error) {
	message, err := client.GetFullMessage(
		ctx,
		messageID,
		proton.NewParallelScheduler(runtime.NumCPU()/2, async.NoopPanicHandler{}),
		proton.NewDefaultAttachmentAllocator(),
	)
	if err != nil {
		return "", fmt.Errorf("impossible de récupérer le message: %w", err)
	}

	// Déchiffrement
	plainBytes, err := message.Decrypt(addrKR)
	if err != nil {
		return "", fmt.Errorf("impossible de déchiffrer le message: %w", err)
	}

	// Construction du message complet
	fullMessage := fmt.Sprintf("Headers:\n%v\n\nContenu:\n%s", message.Header, string(plainBytes))
	return fullMessage, nil
}

// streamMessages crée un flux d'événements pour les nouveaux messages
func StreamMessages(ctx context.Context, client *proton.Client, period, jitter time.Duration) (<-chan string, error) {
	messageIDs := make(chan string)
	stream := client.NewEventStream(ctx, period, jitter, "latest")

	go func() {
		defer close(messageIDs)
		for e := range stream {
			for _, m := range e.Messages {
				fmt.Println(m.Action, m.ID, m.EventItem)
				if m.Action == proton.EventCreate {
					messageIDs <- m.ID
				}
			}
		}
	}()

	return messageIDs, nil
}

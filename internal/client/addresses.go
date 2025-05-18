package client

import (
	"context"
	"fmt"

	"github.com/ProtonMail/gluon/async"
	"github.com/ProtonMail/go-proton-api"
	"github.com/ProtonMail/gopenpgp/v2/crypto"
)

// ProtonAddresses contient les informations utilisateur et les adresses déchiffrées
type ProtonAddresses struct {
	User    *proton.User
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
		User:    &user,
		Addrs:   addrs,
		AddrKRs: addrKRs,
	}, nil
}

package config

import (
	"encoding/json"
	"fmt"
	"os"
	"time"

	"github.com/RealAlphabet/go-protonmail-cli/internal/constants"
	"github.com/pquerna/otp/totp"
)

type Config struct {
	TOTPSecretKey string `json:"totpSecretKey"`
	Username      string `json:"username"`
	Password      string `json:"password"`
}

func LoadConfig() (*Config, error) {
	data, err := os.ReadFile(constants.ConfigFile)
	if err != nil {
		return nil, fmt.Errorf("impossible de lire le fichier de configuration: %w", err)
	}

	var config Config
	if err := json.Unmarshal(data, &config); err != nil {
		return nil, fmt.Errorf("impossible de parser le fichier de configuration: %w", err)
	}

	return &config, nil
}

func GenerateTOTPCode(secretKey string) (string, error) {
	return totp.GenerateCode(secretKey, time.Now())
}

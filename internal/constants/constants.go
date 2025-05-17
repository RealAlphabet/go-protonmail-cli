package constants

const (
	// Fichiers de configuration
	ConfigFile  = "config.json"
	CookiesFile = "cookies.json"

	// Version de l'application
	AppVersion   = "other"
	DebugEnabled = false

	// Messages utilisateur
	CaptchaPromptMessage   = "Veuillez résoudre le CAPTCHA à l'adresse : %s\n"
	CaptchaTokenPrompt     = "Entrez le token CAPTCHA : "
	CaptchaRequiredMessage = "Vérification CAPTCHA requise"
	TOTPAutoMessage        = "Génération automatique du code TOTP..."
	TOTPPrompt             = "Entrez le code TOTP : "

	// Méthode de vérification
	VerificationMethodCaptcha = "captcha"

	// Code d'erreur CAPTCHA
	CaptchaErrorCode = 9001
)

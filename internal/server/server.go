package server

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net"
	"os"
	"runtime"
	"sync"
	"time"

	"github.com/ProtonMail/gluon/async"
	"github.com/ProtonMail/go-proton-api"

	"github.com/RealAlphabet/go-protonmail-cli/gen/proto"
	"github.com/RealAlphabet/go-protonmail-cli/internal/client"
	"github.com/RealAlphabet/go-protonmail-cli/internal/config"
	"github.com/RealAlphabet/go-protonmail-cli/internal/constants"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
)

// Session contient les informations de session d'un utilisateur
type Session struct {
	Client     *proton.Client
	Auth       *proton.Auth
	Manager    *proton.Manager
	ProtonAddr *client.ProtonAddresses
}

// Server implémente le service ProtonmailService
type Server struct {
	proto.UnimplementedProtonmailServiceServer
	sessions map[string]*Session
	mutex    sync.RWMutex
}

func GetTotpCodeFromRequest(req *proto.LoginRequest) (string, error) {
	if req.GetTotpCode() != "" {
		return req.GetTotpCode(), nil
	}
	if req.GetTotpSecret() != "" {
		return config.GenerateTOTPCode(req.GetTotpSecret())
	}
	return "", nil
}

func (s *Server) Login(ctx context.Context, req *proto.LoginRequest) (*proto.LoginResponse, error) {
	log.Printf("Login request received for username: %s", req.GetUsername())

	// Vérifier que username et password sont spécifiés
	if req.GetUsername() == "" || req.GetPassword() == "" {
		return &proto.LoginResponse{
			Result: &proto.LoginResponse_Error{
				Error: &proto.LoginError{
					Type:    proto.LoginError_INVALID_CREDENTIALS,
					Message: "Username and password are required",
				},
			},
		}, nil
	}

	// Créer un nouveau manager pour cette session
	manager := proton.New(
		proton.WithAppVersion(constants.AppVersion),
		proton.WithDebug(constants.DebugEnabled),
	)

	// Tentative de connexion avec ou sans CAPTCHA
	var pClient *proton.Client
	var auth *proton.Auth
	var err error

	if req.GetCaptchaToken() != "" {
		// Connexion avec CAPTCHA
		var authResp proton.Auth
		pClient, authResp, err = manager.NewClientWithLoginWithHVToken(ctx, req.GetUsername(), []byte(req.GetPassword()), &proton.APIHVDetails{
			Token:   req.GetCaptchaToken(),
			Methods: []string{"captcha"},
		})
		auth = &authResp
	} else {
		// Connexion normale
		var authResp proton.Auth
		pClient, authResp, err = manager.NewClientWithLogin(ctx, req.GetUsername(), []byte(req.GetPassword()))
		auth = &authResp
	}

	if err != nil {
		manager.Close()
		// Vérifier si c'est une erreur de CAPTCHA
		var apiErr *proton.APIError

		if errors.As(err, &apiErr) && apiErr.Code == constants.CaptchaErrorCode {
			// Extraire l'URL du CAPTCHA
			var details struct {
				WebUrl string `json:"WebUrl"`
			}

			if err := json.Unmarshal(apiErr.Details, &details); err != nil {
				return nil, fmt.Errorf("impossible de lire les détails du CAPTCHA: %w", err)
			}

			return &proto.LoginResponse{
				Result: &proto.LoginResponse_Error{
					Error: &proto.LoginError{
						Type:       proto.LoginError_CAPTCHA_REQUIRED,
						Message:    "CAPTCHA requis pour la connexion",
						CaptchaUrl: details.WebUrl,
					},
				},
			}, nil
		}

		// Autre erreur de connexion
		return &proto.LoginResponse{
			Result: &proto.LoginResponse_Error{
				Error: &proto.LoginError{
					Type:    proto.LoginError_INVALID_CREDENTIALS,
					Message: err.Error(),
				},
			},
		}, nil
	}

	// Vérifier si TOTP est requis
	if auth.TwoFA.Enabled&proton.HasTOTP != 0 {
		totpCode, err := GetTotpCodeFromRequest(req)
		if err != nil {
			manager.Close()
			return &proto.LoginResponse{
				Result: &proto.LoginResponse_Error{
					Error: &proto.LoginError{
						Type:    proto.LoginError_UNKNOWN,
						Message: err.Error(),
					},
				},
			}, nil
		}

		// Si un code TOTP est fourni
		if totpCode != "" {
			// Authentification avec le code TOTP
			if err := pClient.Auth2FA(ctx, proton.Auth2FAReq{TwoFactorCode: totpCode}); err != nil {
				manager.Close()
				return &proto.LoginResponse{
					Result: &proto.LoginResponse_Error{
						Error: &proto.LoginError{
							Type:    proto.LoginError_INVALID_CREDENTIALS,
							Message: "Code TOTP invalide",
						},
					},
				}, nil
			}
		} else {
			return &proto.LoginResponse{
				Result: &proto.LoginResponse_Error{
					Error: &proto.LoginError{
						Type:    proto.LoginError_TOTP_REQUIRED,
						Message: "Code TOTP requis",
					},
				},
			}, nil
		}
	}

	// Récupérer les adresses et clés
	protonAddrs, err := client.GetProtonAddresses(ctx, pClient, req.GetPassword())
	if err != nil {
		manager.Close()
		return &proto.LoginResponse{
			Result: &proto.LoginResponse_Error{
				Error: &proto.LoginError{
					Type:    proto.LoginError_UNKNOWN,
					Message: fmt.Sprintf("Erreur lors de la récupération des adresses: %v", err),
				},
			},
		}, nil
	}

	// Générer un ID de session unique
	sessionID := fmt.Sprintf("%d", time.Now().UnixNano())

	// Stocker la session
	s.mutex.Lock()
	s.sessions[sessionID] = &Session{
		Client:     pClient,
		Auth:       auth,
		Manager:    manager,
		ProtonAddr: protonAddrs,
	}
	s.mutex.Unlock()

	return &proto.LoginResponse{
		Result: &proto.LoginResponse_Success{
			Success: &proto.LoginSuccess{
				SessionId: sessionID,
			},
		},
	}, nil
}

func (s *Server) Logout(ctx context.Context, req *proto.LogoutRequest) (*proto.LogoutResponse, error) {
	sessionID := req.GetSessionId()
	log.Printf("Logout request for session: %s", sessionID)

	s.mutex.Lock()
	defer s.mutex.Unlock()

	session, exists := s.sessions[sessionID]
	if exists {
		delete(s.sessions, sessionID)
		session.Manager.Close()
		log.Printf("Session %s successfully logged out", sessionID)
	} else {
		log.Printf("Logout attempt on unknown session: %s", sessionID)
	}

	return &proto.LogoutResponse{Success: exists}, nil
}

func (s *Server) FetchEmails(ctx context.Context, req *proto.FetchEmailsRequest) (*proto.MailList, error) {
	sessionID := req.GetSessionId()
	pageIndex := req.GetPageIndex()

	// Récupérer la session
	s.mutex.RLock()
	defer s.mutex.RUnlock()

	session, exists := s.sessions[sessionID]
	if !exists {
		return nil, fmt.Errorf("session non trouvée")
	}

	log.Printf("FetchEmails request for session: %s, page %d", sessionID, pageIndex)

	// Récupérer les messages
	emails, err := session.Client.GetMessageMetadataPage(ctx, int(pageIndex), 50, proton.MessageFilter{})
	if err != nil {
		return nil, fmt.Errorf("erreur lors de la récupération des messages: %v", err)
	}

	const maxGoroutines = 50

	// canal tamponné qui sert de sémaphore
	sem := make(chan struct{}, maxGoroutines)

	// WaitGroup pour attendre la fin de toutes les goroutines
	var wg sync.WaitGroup

	// mutex pour protéger l’accès à la slice mails
	var mu sync.Mutex
	var mails []*proto.Mail

	for _, email := range emails {
		wg.Add(1)
		// acquérir une “place” dans le sémaphore
		sem <- struct{}{}

		go func(email proton.MessageMetadata) {
			defer wg.Done()
			defer func() { <-sem }() // libérer la place

			message, err := session.Client.GetFullMessage(
				ctx,
				email.ID,
				proton.NewParallelScheduler(runtime.NumCPU()/2, async.NoopPanicHandler{}),
				proton.NewDefaultAttachmentAllocator(),
			)
			if err != nil {
				log.Printf("Erreur lors de la récupération du message %s: %v", email.ID, err)
				return
			}

			// votre code de déchiffrement
			addrKR := session.ProtonAddr.AddrKRs[session.ProtonAddr.Addrs[0].ID]
			content, err := message.Decrypt(addrKR)
			if err != nil {
				log.Printf("Erreur déchiffrement %s: %v", email.ID, err)
				return
			}

			mail := &proto.Mail{
				Id:        email.ID,
				Subject:   email.Subject,
				Sender:    email.Sender.Address,
				Content:   string(content),
				Timestamp: email.Time,
			}

			mu.Lock()
			mails = append(mails, mail)
			mu.Unlock()
		}(email)
	}

	// attendre que tout soit terminé
	wg.Wait()

	return &proto.MailList{
		Mails: mails,
	}, nil
}

func (s *Server) FetchEmailByID(ctx context.Context, req *proto.FetchEmailByIDRequest) (*proto.Mail, error) {
	sessionID := req.GetSessionId()
	emailID := req.GetEmailId()

	// Récupérer la session
	s.mutex.RLock()
	defer s.mutex.RUnlock()

	session, exists := s.sessions[sessionID]
	if !exists {
		return nil, fmt.Errorf("session non trouvée")
	}

	log.Printf("FetchEmailByID request for session: %s, ID: %s", sessionID, emailID)

	// Récupérer le message
	message, err := session.Client.GetFullMessage(
		ctx,
		emailID,
		proton.NewParallelScheduler(runtime.NumCPU()/2, async.NoopPanicHandler{}),
		proton.NewDefaultAttachmentAllocator(),
	)
	if err != nil {
		return nil, fmt.Errorf("erreur lors de la récupération du message: %v", err)
	}

	// Utiliser la première adresse pour le déchiffrement
	addrKR := session.ProtonAddr.AddrKRs[session.ProtonAddr.Addrs[0].ID]
	messageBytes, err := message.Decrypt(addrKR)
	if err != nil {
		return nil, fmt.Errorf("impossible de déchiffrer le message: %w", err)
	}

	return &proto.Mail{
		Id:        emailID,
		Subject:   message.Subject,
		Sender:    message.Sender.Address,
		Content:   string(messageBytes),
		Timestamp: message.Time,
	}, nil
}

func (s *Server) RequestStreamEmails(req *proto.StreamEmailsRequest, stream proto.ProtonmailService_RequestStreamEmailsServer) error {
	sessionID := req.GetSessionId()

	// Récupérer la session
	s.mutex.RLock()
	defer s.mutex.RUnlock()

	session, exists := s.sessions[sessionID]
	if !exists {
		return fmt.Errorf("session non trouvée")
	}

	log.Printf("Stream started for session: %s", sessionID)

	// Démarrer le stream d'événements
	messageIDs, err := client.StreamMessages(stream.Context(), session.Client, 10*time.Second, 5*time.Second)
	if err != nil {
		return fmt.Errorf("erreur lors du démarrage du stream: %v", err)
	}

	// Traiter les nouveaux messages
	for messageID := range messageIDs {
		message, err := session.Client.GetFullMessage(
			stream.Context(),
			messageID,
			proton.NewParallelScheduler(runtime.NumCPU()/2, async.NoopPanicHandler{}),
			proton.NewDefaultAttachmentAllocator(),
		)
		if err != nil {
			log.Printf("Erreur lors de la récupération du message %s: %v", messageID, err)
			stream.Send(&proto.ServerEvent{
				Event: &proto.ServerEvent_Error{
					Error: &proto.ErrorMessage{
						Message: fmt.Sprintf("Erreur lors de la récupération du message %s: %v", messageID, err),
					},
				},
			})
			continue
		}

		// Utiliser la première adresse pour le déchiffrement
		addrKR := session.ProtonAddr.AddrKRs[session.ProtonAddr.Addrs[0].ID]
		messageBytes, err := message.Decrypt(addrKR)
		if err != nil {
			log.Printf("Erreur lors du déchiffrement du message %s: %v", messageID, err)
			stream.Send(&proto.ServerEvent{
				Event: &proto.ServerEvent_Error{
					Error: &proto.ErrorMessage{
						Message: fmt.Sprintf("Erreur lors du déchiffrement du message %s: %v", messageID, err),
					},
				},
			})
			continue
		}

		// Envoyer le nouveau message au client
		mail := &proto.Mail{
			Id:        messageID,
			Subject:   message.Subject,
			Sender:    message.Sender.Address,
			Content:   string(messageBytes),
			Timestamp: message.Time,
		}

		err = stream.Send(&proto.ServerEvent{
			Event: &proto.ServerEvent_NewMail{
				NewMail: &proto.NewMailNotification{Mail: mail},
			},
		})
		if err != nil {
			log.Printf("Erreur lors de l'envoi du message %s: %v", messageID, err)
			return err
		}
	}
	return nil
}

// Serve démarre le serveur gRPC sur Unix socket
func Serve(socketPath string) error {
	// Supprimer le socket s'il existe déjà
	if err := os.RemoveAll(socketPath); err != nil {
		return fmt.Errorf("failed to remove existing socket: %v", err)
	}

	// Créer le listener Unix
	lis, err := net.Listen("unix", socketPath)
	if err != nil {
		return fmt.Errorf("failed to listen: %v", err)
	}

	// Créer le serveur gRPC
	s := grpc.NewServer(grpc.Creds(insecure.NewCredentials()))
	proto.RegisterProtonmailServiceServer(s, &Server{
		sessions: make(map[string]*Session),
	})

	// Démarrer le serveur
	log.Printf("Server listening on %s", socketPath)
	return s.Serve(lis)
}

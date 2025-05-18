package main

import (
	"log"

	"github.com/RealAlphabet/go-protonmail-cli/internal/server"
)

func main() {
	socket := "/tmp/protonmail.sock"
	if err := server.Serve(socket); err != nil {
		log.Fatalf("Erreur serveur: %v", err)
	}
}

package client

import (
	"context"
	"fmt"
	"time"

	"github.com/ProtonMail/go-proton-api"
)

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

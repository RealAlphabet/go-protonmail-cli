grpcurl \
  -plaintext \
  -authority dummy \
  -import-path ./proto \
  -proto protonmail.proto \
  -d '{"username":"email","password":"password","totpSecret":"totpSecret"}' \
  unix:///tmp/protonmail.sock \
  protonmail.ProtonmailService/Login

grpcurl \
  -plaintext \
  -authority dummy \
  -import-path ./proto \
  -proto protonmail.proto \
  -d '{"session_id":"","page_index":0,"page_size":10}' \
  unix:///tmp/protonmail.sock \
  protonmail.ProtonmailService/FetchEmails

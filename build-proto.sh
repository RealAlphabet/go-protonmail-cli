#!/bin/bash

./check-env.sh

mkdir -p gen

protoc \
  --go_out=gen \
  --go-grpc_out=gen \
  --go_opt=paths=source_relative \
  --go-grpc_opt=paths=source_relative \
  proto/protonmail.proto

#!/bin/bash

set -e

echo "🔍 Checking environment..."

# Check protoc
if ! command -v protoc &> /dev/null; then
  echo "❌ protoc not found. Please install Protocol Buffers compiler:"
  echo "👉 https://grpc.io/docs/protoc-installation/"
  exit 1
else
  echo "✅ protoc found: $(protoc --version)"
fi

# Check protoc-gen-go
if ! command -v protoc-gen-go &> /dev/null; then
  echo "❌ protoc-gen-go not found."
  echo "💡 Install it using:"
  echo "   go install google.golang.org/protobuf/cmd/protoc-gen-go@latest"
  echo "   And ensure \$GOPATH/bin is in your \$PATH"
  exit 1
else
  echo "✅ protoc-gen-go found: $(which protoc-gen-go)"
fi

# Check protoc-gen-go-grpc
if ! command -v protoc-gen-go-grpc &> /dev/null; then
  echo "❌ protoc-gen-go-grpc not found."
  echo "💡 Install it using:"
  echo "   go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@latest"
  echo "   And ensure \$GOPATH/bin is in your \$PATH"
  exit 1
else
  echo "✅ protoc-gen-go-grpc found: $(which protoc-gen-go-grpc)"
fi

echo "🎉 All required tools are installed."

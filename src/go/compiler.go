package main

import (
	"bytes"
	"compress/gzip"
	"crypto/sha256"
	_ "embed"
	"encoding/hex"
	"fmt"
	"io"
	"os"
	"os/exec"
	"os/signal"
	"path/filepath"
	"runtime"
	"syscall"
)

//go:embed node.gz
var nodeBinaryCompressed []byte

//go:embed bundled.js.gz
var jsappCompressed []byte

// SHA-256 digests of the inflated node runtime and application bundle, computed
// and substituted at compile time.
var expectedNodeChecksum = "{{nodeChecksum}}"
var expectedBundleChecksum = "{{bundleChecksum}}"

// gunzipToFile inflates data into dir/filename and returns the written path
// along with the SHA-256 digest of the inflated bytes, computed as they stream
// to disk.
func gunzipToFile(data []byte, dir, filename string, perm os.FileMode) (string, string, error) {
	reader, err := gzip.NewReader(bytes.NewReader(data))
	if err != nil {
		return "", "", err
	}
	defer reader.Close()

	dest := filepath.Join(dir, filename)

	out, err := os.OpenFile(dest, os.O_WRONLY|os.O_CREATE|os.O_EXCL, perm)
	if err != nil {
		return "", "", err
	}

	hasher := sha256.New()
	if _, err := io.Copy(io.MultiWriter(out, hasher), reader); err != nil {
		out.Close()
		return "", "", err
	}

	if err := out.Close(); err != nil {
		return "", "", err
	}

	return dest, hex.EncodeToString(hasher.Sum(nil)), nil
}

func run() (int, error) {
	workDir, err := os.MkdirTemp("", "nodec-{{appName}}-")
	if err != nil {
		return 1, fmt.Errorf("failed to create working directory: %w", err)
	}
	defer os.RemoveAll(workDir)

	nodeName := "node"
	if runtime.GOOS == "windows" {
		nodeName = "node.exe"
	}

	nodePath, nodeChecksum, err := gunzipToFile(nodeBinaryCompressed, workDir, nodeName, 0700)
	if err != nil {
		return 1, fmt.Errorf("failed to write node runtime: %w", err)
	}
	if nodeChecksum != expectedNodeChecksum {
		return 1, fmt.Errorf(
			"security warning: the embedded node runtime failed its integrity check (expected %s, got %s); refusing to execute",
			expectedNodeChecksum, nodeChecksum,
		)
	}

	bundlePath, bundleChecksum, err := gunzipToFile(jsappCompressed, workDir, "bundle.js", 0600)
	if err != nil {
		return 1, fmt.Errorf("failed to write javascript bundle: %w", err)
	}
	if bundleChecksum != expectedBundleChecksum {
		return 1, fmt.Errorf(
			"security warning: the embedded application bundle failed its integrity check (expected %s, got %s); refusing to execute",
			expectedBundleChecksum, bundleChecksum,
		)
	}

	// this will be set by the JS build runtime, before Go is used to compile
	nodeFlags := []string{}

	args := append([]string{}, nodeFlags...)
	args = append(args, bundlePath)
	args = append(args, os.Args[1:]...)

	cmd := exec.Command(nodePath, args...)
	cmd.Stdin = os.Stdin
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	sigchan := make(chan os.Signal, 1)
	signal.Notify(sigchan, os.Interrupt, syscall.SIGTERM)
	defer signal.Stop(sigchan)

	if err := cmd.Start(); err != nil {
		return 1, fmt.Errorf("failed to start node: %w", err)
	}

	go func() {
		for s := range sigchan {
			if cmd.Process != nil {
				_ = cmd.Process.Signal(s)
			}
		}
	}()

	if err := cmd.Wait(); err != nil {
		if exitErr, ok := err.(*exec.ExitError); ok {
			return exitErr.ExitCode(), nil
		}
		return 1, fmt.Errorf("node failed to run: %w", err)
	}

	return 0, nil
}

func main() {
	code, err := run()
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
	}
	os.Exit(code)
}

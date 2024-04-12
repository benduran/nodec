package main

import (
	"bytes"
	"compress/gzip"
	_ "embed"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path"
)

//go:embed node.gz
var nodeBinaryCompressed []byte

//go:embed bundled.js.gz
var jsappCompressed []byte

func cleanup(tmpNodePath, tmpJsBundlePath string) error {
	err := os.Remove(tmpNodePath)
	if err != nil {
		return err
	}

	return os.Remove(tmpJsBundlePath)
}

func main() {
	// inflate the gzip-compressed application
	nodeBinary, err := decompressGzip(nodeBinaryCompressed)

	if err != nil {
		fmt.Println(err)
		os.Exit(1)
	}

	// infalte the gzip-compressed JS bundle
	jsBundle, err := decompressGzip(jsappCompressed)

	if err != nil {
		fmt.Println(err)
		os.Exit(1)
	}

	// Write the embedded Node.js binary to a temporary file
	tmpNodePath, err := writeTempFile(nodeBinary, "node")
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to write temporary node binary: %v\n", err)
		os.Exit(1)
	}

	tmpJsBundlePath, err := writeTempFile(jsBundle, "bundle.js")
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to inflate bundled javascript: %v\n", err)
		os.Exit(1)
	}

	// Get command line arguments, excluding the name of the program itself
	args := os.Args[1:]

	// place the bundle.js as the script target via the last argument
	args = append(args, tmpJsBundlePath)

	// Create a command with the arguments
	cmd := exec.Command(tmpNodePath, args...)

	// Set up the pipes
	cmd.Stdin = os.Stdin
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	// always destroy the node.js stuffs when we're done with it
	defer cleanup(tmpNodePath, tmpJsBundlePath)

	// Start the command
	err = cmd.Start()
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to start node: %v\n", err)
		os.Exit(1)
	}

	// Wait for the command to finish
	err = cmd.Wait()
	if err != nil {
		fmt.Fprintf(os.Stderr, "node exited with error: %v\n", err)
		os.Exit(1)
	}
}

func writeTempFile(data []byte, filename string) (string, error) {
	tmpFileDir := path.Join(os.TempDir(), "nodec", "extracted")
	err := os.MkdirAll(tmpFileDir, 0755)

	if err != nil {
		return "", err
	}

	tmpFilePath := path.Join(tmpFileDir, filename)

	tmpFile, err := os.Create(tmpFilePath)
	if err != nil {
		return "", err
	}

	_, err = io.Copy(tmpFile, bytes.NewReader(data))
	if err != nil {
		return "", err
	}

	err = tmpFile.Close()
	if err != nil {
		return "", err
	}

	err = os.Chmod(tmpFile.Name(), 0755)
	if err != nil {
		return "", err
	}

	return tmpFile.Name(), nil
}

func decompressGzip(data []byte) ([]byte, error) {
	reader, err := gzip.NewReader(bytes.NewReader(data))
	if err != nil {
		return nil, err
	}
	defer reader.Close()

	buf := new(bytes.Buffer)
	if _, err := io.Copy(buf, reader); err != nil {
		return nil, err
	}

	return buf.Bytes(), nil
}

package main

import (
	"archive/tar"
	"bytes"
	"compress/gzip"
	"crypto/sha256"
	"debug/elf"
	_ "embed"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"io/fs"
	"os"
	"os/exec"
	"os/signal"
	"path/filepath"
	"runtime"
	"strings"
	"syscall"
)

//go:embed node.gz
var nodeBinaryCompressed []byte

//go:embed bundled.js.gz
var jsappCompressed []byte

//go:embed libs.tar.gz
var runtimeLibsCompressed []byte

// SHA-256 digests of the inflated node runtime and application bundle, computed
// and substituted at compile time.
var expectedNodeChecksum = "{{nodeChecksum}}"
var expectedBundleChecksum = "{{bundleChecksum}}"
var expectedLibsChecksum = "{{libsChecksum}}"

func sha256Sum(data []byte) []byte {
	sum := sha256.Sum256(data)
	return sum[:]
}

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

func extractRuntimeLibs(dir string) (string, error) {
	reader, err := gzip.NewReader(bytes.NewReader(runtimeLibsCompressed))
	if err != nil {
		return "", err
	}
	defer reader.Close()

	inflated, err := io.ReadAll(reader)
	if err != nil {
		return "", err
	}
	if checksum := hex.EncodeToString(sha256Sum(inflated)); checksum != expectedLibsChecksum {
		return "", fmt.Errorf(
			"security warning: the embedded runtime libraries failed their integrity check (expected %s, got %s); refusing to execute",
			expectedLibsChecksum, checksum,
		)
	}

	libDir := filepath.Join(dir, "lib")
	if err := os.Mkdir(libDir, 0700); err != nil {
		return "", err
	}

	written := 0
	archive := tar.NewReader(bytes.NewReader(inflated))
	for {
		header, err := archive.Next()
		if err == io.EOF {
			break
		}
		if err != nil {
			return "", err
		}
		if header.Typeflag != tar.TypeReg {
			continue
		}

		name := filepath.Base(header.Name)
		if name != header.Name {
			return "", fmt.Errorf("unexpected path %q in the runtime library archive", header.Name)
		}

		out, err := os.OpenFile(filepath.Join(libDir, name), os.O_WRONLY|os.O_CREATE|os.O_EXCL, 0700)
		if err != nil {
			return "", err
		}
		if _, err := io.Copy(out, archive); err != nil {
			out.Close()
			return "", err
		}
		if err := out.Close(); err != nil {
			return "", err
		}
		written++
	}

	if written == 0 {
		return "", nil
	}

	return libDir, nil
}

// elfInterpreter returns the ELF program interpreter (the PT_INTERP entry, i.e.
// the dynamic loader) that the binary at path must be started through, or ""
// for a non-ELF or fully-static binary that names none.
func elfInterpreter(path string) string {
	file, err := elf.Open(path)
	if err != nil {
		return ""
	}
	defer file.Close()

	for _, prog := range file.Progs {
		if prog.Type != elf.PT_INTERP {
			continue
		}
		raw, err := io.ReadAll(prog.Open())
		if err != nil {
			return ""
		}
		return strings.TrimRight(string(raw), "\x00")
	}

	return ""
}

func explainStartFailure(nodePath string, err error) error {
	generic := fmt.Errorf("failed to start node: %w", err)

	if !errors.Is(err, fs.ErrNotExist) {
		return generic
	}
	if _, statErr := os.Stat(nodePath); statErr != nil {
		return generic
	}

	interpreter := elfInterpreter(nodePath)
	if interpreter == "" {
		return generic
	}
	if _, statErr := os.Stat(interpreter); statErr == nil {
		return generic
	}

	mismatch := "this binary carries a glibc build of node, but this host does not provide that loader (it looks like a musl system, e.g. Alpine)"
	if strings.Contains(interpreter, "musl") {
		mismatch = "this binary carries a musl build of node, but this host does not provide that loader (it looks like a glibc system, e.g. Debian or Ubuntu)"
	}

	return fmt.Errorf(
		"failed to start node: the embedded node runtime requires the ELF interpreter %q, which does not exist on this system -- %s. "+
			"The runtime itself was extracted fine (%s); it is the loader that is missing. "+
			"Rebuild this application with a target matching the host's C library",
		interpreter, mismatch, nodePath,
	)
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

	libDir, err := extractRuntimeLibs(workDir)
	if err != nil {
		return 1, fmt.Errorf("failed to write the bundled runtime libraries: %w", err)
	}

	cmd := exec.Command(nodePath, args...)
	cmd.Stdin = os.Stdin
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	cmd.Env = os.Environ()

	// Point the dynamic loader at the bundled copies. Note this takes priority
	// over the system's own libraries for node and anything it spawns, which is
	// deliberate (it makes the runtime behave identically on every host rather
	// than varying with whatever the distro happens to provide).
	if libDir != "" {
		libraryPath := libDir
		if inherited := os.Getenv("LD_LIBRARY_PATH"); inherited != "" {
			libraryPath = libDir + string(os.PathListSeparator) + inherited
		}
		cmd.Env = append(cmd.Env, "LD_LIBRARY_PATH="+libraryPath)
	}

	sigchan := make(chan os.Signal, 1)
	signal.Notify(sigchan, os.Interrupt, syscall.SIGTERM)
	defer signal.Stop(sigchan)

	if err := cmd.Start(); err != nil {
		return 1, explainStartFailure(nodePath, err)
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

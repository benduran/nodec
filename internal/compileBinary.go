package internal

import (
	"os"
	"os/exec"
	"path"
)

// given the os, CPU and path to the prepped contents,
// compiles the standalone binary for the user
func CompileBinary(osToUse, arch, downloadFolder string) {
	// go must be installed and available in the user's $PATH
	entrypoint := path.Join(downloadFolder, "compiler.go")

	cmd := exec.Command("go", []string{"build", entrypoint}...)
	cmd.Stdin = os.Stdin
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	err := cmd.Start()
	if err != nil {
		panic(err)
	}
}

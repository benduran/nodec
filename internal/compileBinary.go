package internal

import (
	"fmt"
	"os"
	"os/exec"
	"path"
)

// given the os, CPU and path to the prepped contents,
// compiles the standalone binary for the user
func CompileBinary(appName, osToUse, arch, downloadFolder string) {
	// go must be installed and available in the user's $PATH
	entrypoint := path.Join(downloadFolder, "compiler.go")

	pwd := GetCWD()

	cmd := exec.Command("go", []string{"build", entrypoint}...)
	cmd.Stdin = os.Stdin
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	err := cmd.Start()
	if err != nil {
		panic(err)
	}

	// rename the compiler binary to match the user's desired app-name plus OS & Arch

	newFileName := fmt.Sprintf("%s-%s-%s", appName, osToUse, arch)

	err = os.Rename(path.Join(pwd, "compiler"), path.Join(pwd, newFileName))

	if err != nil {
		panic(err)
	}
}

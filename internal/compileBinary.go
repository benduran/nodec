package internal

import (
	"fmt"
	"os"
	"os/exec"
	"path"
)

// given the os, CPU and path to the prepped contents,
// compiles the standalone binary for the user
func CompileBinary(appName, osToUse, arch, downloadFolder string) (string, error) {
	// go must be installed and available in the user's $PATH
	entrypoint := path.Join(downloadFolder, "compiler.go")

	pwd, err := GetCWD()

	if err != nil {
		return "", err
	}

	compileEnv := os.Environ()

	goTargetArch := ""
	if arch == "x64" {
		goTargetArch = "amd64"
	} else {
		goTargetArch = arch
	}

	goTargetOs := ""
	if osToUse == "macos" {
		goTargetOs = "darwin"
	} else if osToUse == "win" {
		goTargetOs = "windows"
	} else {
		goTargetOs = "linux"
	}

	compileEnv = append(compileEnv, fmt.Sprintf("GOARCH=%s", goTargetArch))
	compileEnv = append(compileEnv, fmt.Sprintf("GOOS=%s", goTargetOs))

	cmd := exec.Command("go", []string{"build", entrypoint}...)
	cmd.Env = compileEnv
	cmd.Stdin = os.Stdin
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	err = cmd.Start()
	if err != nil {
		return "", err
	}

	// rename the compiler binary to match the user's desired app-name plus OS & Arch

	newFileName := fmt.Sprintf("%s-%s-%s", appName, osToUse, arch)

	renamedFilePath := path.Join(pwd, newFileName)
	err = os.Rename(path.Join(pwd, "compiler"), renamedFilePath)

	if err != nil {
		return "", err
	}

	return newFileName, nil
}

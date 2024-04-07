package internal

import (
	"flag"
	"fmt"
	"nodec/structs"
	"regexp"
	"runtime"
	"strings"
)

type NodeCArgs struct {
	AppName     string
	Entry       string
	NodeVersion string
	Target      []string
}

/**
* Validates a target a user inputted is supported by
* nodec
 */
func validateTarget(tgt string) bool {
	isValid := false
	for i := 0; i < len(structs.AllowedTargets); i++ {
		allowed := structs.AllowedTargets[i]

		isValid = allowed == tgt
		if isValid {
			return isValid
		}
	}

	return isValid
}

/*
* Sets up which command-line flags are allowed
* and actually parses them
 */
func ParseArgs() (NodeCArgs, error) {
	appNamePtr := flag.String("name", "my-app", "the final outputted filename that represents your compiled application")
	targetPtr := flag.String(
		"target",
		"",
		fmt.Sprintf("possible values (one or more, comma-separated): %s", strings.Join(structs.AllowedTargets, ",")),
	)
	nodeVersionPtr := flag.String(
		"node-version",
		"20.12.0",
		"defines the version of NodeJS that will be used when compiling your standalone executable. Must be an explicit version. SemVer is not supported.",
	)
	entryPtr := flag.String("entry", "", "(Required): The entrypoint to your JavaScript or TypeScript application")

	flag.Parse()

	entry := *entryPtr

	targetRegexp := regexp.MustCompile(`\s*,\s*`)

	target := []string{}
	trimmedTarget := strings.TrimSpace(*targetPtr)
	nodeVersion := strings.TrimSpace(*nodeVersionPtr)

	if len(trimmedTarget) > 0 {
		target = targetRegexp.Split(trimmedTarget, -1)
	} else {
		// user never specified a target, so just use their current OS
		osToUse := ""
		archToUse := ""

		if runtime.GOOS == "darwin" {
			osToUse = "macos"
		} else if runtime.GOOS == "linux" {
			osToUse = "linux"
		} else if runtime.GOOS == "windows" {
			osToUse = "win"
		} else {
			// we will panic further down the chain
			osToUse = runtime.GOOS
		}

		if runtime.GOARCH == "arm64" {
			archToUse = "arm64"
		} else if runtime.GOARCH == "amd64" {
			archToUse = "x64"
		} else {
			archToUse = runtime.GOARCH
		}

		target = append(target, fmt.Sprintf("%s-%s", osToUse, archToUse))
	}

	formattedTargets := []string{}

	for i := 0; i < len(target); i++ {
		tgt := target[i]
		formatted := strings.TrimSpace(tgt)

		if !validateTarget(tgt) {
			return NodeCArgs{}, fmt.Errorf("%s is not a valid OS + ARCH target currently supported by nodec", tgt)
		}
		formattedTargets = append(formattedTargets, formatted)
	}

	args := NodeCArgs{
		AppName:     *appNamePtr,
		Entry:       entry,
		NodeVersion: nodeVersion,
		Target:      formattedTargets,
	}

	return args, nil
}

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
	Target []string
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
	targetPtr := flag.String(
		"target",
		"",
		fmt.Sprintf("possible values (one or more, comma-separated): %s", strings.Join(structs.AllowedTargets, ",")),
	)

	flag.Parse()

	targetRegexp := regexp.MustCompile(`\s*,\s*`)

	target := []string{}
	trimmedTarget := strings.TrimSpace(*targetPtr)

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
		Target: formattedTargets,
	}

	return args, nil
}

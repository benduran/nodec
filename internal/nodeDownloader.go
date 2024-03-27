package internal

import "fmt"

/**
* Constructs a well-formed URL to the location
* where a prebuilt node.js binary can be downloaded from
 */
func getNodeDownloadUrl(version string, os string, arch string) string {
	// linux format: https://nodejs.org/dist/v20.12.0/node-v20.12.0-linux-x64.tar.xz
	// mac format: https://nodejs.org/dist/v20.12.0/node-v20.12.0-darwin-arm64.tar.gz
	// windows format: https://nodejs.org/dist/v20.12.0/node-v20.12.0-win-x64.zip

	archToDL := ""
	osToDL := ""
	ext := ""

	if os == "macos" {
		osToDL = "darwin"
		ext = "tar.gz"
	} else if os == "win" {
		osToDL = "win"
		ext = "zip"
	} else {
		osToDL = "linux"
		ext = "tar.gz"
	}

	if arch == "arm64" {
		archToDL = "arm64"
	} else {
		archToDL = "x64"
	}

	return fmt.Sprintf("https://nodejs.org/dist/v%s/node-v%s-%s-%s.%s", version, version, osToDL, archToDL, ext)
}

/**
* Downloads the request version of node
 */
func DownloadNode(version string, os string, arch string) {
	fmt.Println(getNodeDownloadUrl(version, os, arch))
}

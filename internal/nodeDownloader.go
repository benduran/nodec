package internal

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"path"
)

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

type DownloadNodeResult struct {
	Arch         string
	DownloadPath string
	OS           string
	Version      string
}

/**
* Downloads the request version of node
 */
func DownloadNode(version string, osToUse string, archToUse string) *DownloadNodeResult {
	downloadUrl := getNodeDownloadUrl(version, osToUse, archToUse)

	archiveExt := ""
	if osToUse == "macos" || osToUse == "linux" {
		archiveExt = "tar.gz"
	} else {
		archiveExt = "zip"
	}

	dlFilename := fmt.Sprintf("node-%s-%s-%s.%s", version, osToUse, archToUse, archiveExt)

	tmpFolder := path.Join(os.TempDir(), "nodec")
	err := os.MkdirAll(tmpFolder, 0755)
	if err != nil {
		panic(err)
	}

	dlFilePath := path.Join(tmpFolder, dlFilename)

	dlLocation, err := os.Create(dlFilePath)
	if err != nil {
		panic(err)
	}

	defer dlLocation.Close()

	dlMessage := fmt.Sprintf("Downloading Node.js %s for %s-%s from %s to %s", version, osToUse, archToUse, downloadUrl, dlFilePath)
	fmt.Println(dlMessage)

	res, err := http.Get(downloadUrl)

	if err != nil {
		panic(err)
	}

	defer res.Body.Close()

	_, err = io.Copy(dlLocation, res.Body)

	if err != nil {
		panic(err)
	}

	result := DownloadNodeResult{
		Arch:         archToUse,
		DownloadPath: dlFilePath,
		OS:           osToUse,
		Version:      version,
	}

	return &result
}

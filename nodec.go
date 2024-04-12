package main

import (
	"fmt"
	"nodec/internal"
	"os"
	"strings"
)

func setupCLI() (string, error) {
	args, err := internal.ParseArgs()

	if err != nil {
		fmt.Println(err)
		os.Exit(1)
	}

	if len(args.Entry) <= 0 {
		fmt.Println(fmt.Errorf("you must specify an --entry"))
		os.Exit(1)
	}

	downloadFolder := ""

	for _, tgt := range args.Target {
		splitTarget := strings.Split(tgt, "-")
		osToUse := splitTarget[0]
		archToUse := splitTarget[1]

		downloadResult, err := internal.DownloadNode(args.NodeVersion, osToUse, archToUse)

		if err != nil {
			fmt.Println("Failed to download a node version")
			return "", err
		}

		downloadFolder = downloadResult.DownloadFolder

		downloadedMsg := fmt.Sprintf("Downloaded node to %s", downloadResult.DownloadPath)
		fmt.Println(downloadedMsg)

		compilerRenderLocation, err := internal.RenderCompiler(downloadResult.DownloadFolder)

		if err != nil {
			fmt.Println("Failed to render the nodec interstitial compiler")
			return "", err
		}

		renderedMsg := fmt.Sprintf("Rendered the nodec compiler to %s", compilerRenderLocation)
		fmt.Println(renderedMsg)

		bundledCodePath, err := internal.BundleJavaScript(args.Entry, args.AppName, args.NodeVersion, downloadResult.DownloadFolder)

		if err != nil {
			fmt.Println("Failed to bundle your Node-friendly code")
			return "", err
		}

		renderedMsg = fmt.Sprintf("Bundled JS & TS code to %s", bundledCodePath)
		fmt.Println(renderedMsg)

		renderedMsg = fmt.Sprintf("compiling target %s-%s", downloadResult.OS, downloadResult.Arch)
		fmt.Println(renderedMsg)
		compiledResult, err := internal.CompileBinary(args.AppName, osToUse, archToUse, downloadResult.DownloadFolder)

		if err != nil {
			fmt.Println("Failed to compile your binary")
			return "", err
		}

		renderedMsg = fmt.Sprintf("Success! Your application has been compiled and is available at %s", compiledResult)
		fmt.Println(renderedMsg)
	}
	return downloadFolder, nil
}

func main() {
	folderToCleanup, err := setupCLI()

	if len(folderToCleanup) > 0 {
		defer os.RemoveAll(folderToCleanup)
	}

	if err != nil {
		panic(err)
	}
}

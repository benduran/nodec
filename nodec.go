package main

import (
	"fmt"
	"nodec/internal"
	"strings"
)

func main() {
	args, err := internal.ParseArgs()

	if err != nil {
		panic(err)
	}

	for _, tgt := range args.Target {
		splitTarget := strings.Split(tgt, "-")
		osToUse := splitTarget[0]
		archToUse := splitTarget[1]

		downloadResult := internal.DownloadNode(args.NodeVersion, osToUse, archToUse)

		downloadedMsg := fmt.Sprintf("Downloaded node to %s", downloadResult.DownloadPath)
		fmt.Println(downloadedMsg)

		compilerRenderLocation := internal.RenderCompiler(downloadResult.DownloadFolder)

		renderedMsg := fmt.Sprintf("Rendered the nodec compiler to %s", compilerRenderLocation)
		fmt.Println(renderedMsg)

		bundledCodePath := internal.BundleJavaScript(args.Entry, args.AppName, args.NodeVersion, downloadResult.DownloadFolder)
		renderedMsg = fmt.Sprintf("Bundled JS & TS code to %s", bundledCodePath)
		fmt.Println(renderedMsg)

		renderedMsg = fmt.Sprintf("compiling target %s-%s", downloadResult.OS, downloadResult.Arch)
		fmt.Println(renderedMsg)
		compiledResult := internal.CompileBinary(args.AppName, osToUse, archToUse, downloadResult.DownloadFolder)

		renderedMsg = fmt.Sprintf("Success! Your application has been compiled and is available at %s", compiledResult)
		fmt.Println(renderedMsg)
	}
}

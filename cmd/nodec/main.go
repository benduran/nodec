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
		downloadResult := internal.DownloadNode(args.NodeVersion, splitTarget[0], splitTarget[1])

		downloadedMsg := fmt.Sprintf("Downloaded node to %s", downloadResult.DownloadPath)
		fmt.Println(downloadedMsg)

		compilerRenderLocation := internal.RenderCompiler(downloadResult.DownloadFolder)

		renderedMsg := fmt.Sprintf("Rendered the nodec compiler to %s", compilerRenderLocation)
		fmt.Println(renderedMsg)
	}
}

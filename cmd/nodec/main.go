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
		fmt.Printf("Downloaded node to %s", downloadResult.DownloadPath)
	}

	compilerRenderLocation := internal.RenderCompiler()
}

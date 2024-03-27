package main

import (
	"nodec/internal"
	"strings"
)

func main() {
	args, err := internal.ParseArgs()

	if err != nil {
		panic(err)
	}

	for i := 0; i < len(args.Target); i++ {
		splitTarget := strings.Split(args.Target[i], "-")
		internal.DownloadNode(args.NodeVersion, splitTarget[0], splitTarget[1])
	}
}

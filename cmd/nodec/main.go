package main

import (
	"fmt"
	"nodec/internal"
)

func main() {
	args, err := internal.ParseArgs()

	if err != nil {
		panic(err)
	}

	fmt.Printf("target is %s", args.Target)
}

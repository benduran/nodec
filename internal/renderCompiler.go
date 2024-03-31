package internal

import (
	_ "embed"
	"os"
	"path"
)

// embed compiler.go.tmp
var compilerCode []byte

/**
* Renders the compiler to a temp location for use
* by the system's go compiler
 */
func RenderCompiler() string {
	compilerRenderLocation := path.Join(os.TempDir(), "nodec", "compiler.go")
	err := os.MkdirAll(compilerRenderLocation, 0755)

	if err != nil {
		panic(err)
	}

	err = os.WriteFile(compilerRenderLocation, compilerCode, 0755)
	if err != nil {
		panic(err)
	}

	return compilerRenderLocation
}

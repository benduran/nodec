package internal

import (
	_ "embed"
	"fmt"
	"os"
	"path"
)

//go:embed compiler.go.tmp
var compilerCode []byte

/**
* Renders the compiler to a temp location for use
* by the system's go compiler
 */
func RenderCompiler(dlFolder string) (string, error) {
	compilerRenderLocation := path.Join(dlFolder, "compiler.go")

	err := os.MkdirAll(path.Dir(compilerRenderLocation), 0755)
	if err != nil {
		return "", err
	}

	if len(compilerCode) <= 0 {
		return "", fmt.Errorf("unable to render the compiler code because it was not embedded properly")
	}

	// always remove any existing compiler file at this location
	os.Remove(compilerRenderLocation)

	err = os.WriteFile(compilerRenderLocation, compilerCode, 0755)

	if err != nil {
		return "", err
	}

	return compilerRenderLocation, nil
}

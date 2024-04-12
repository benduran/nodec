package internal

import (
	"fmt"
	"os"
	"path"
	"strings"

	"github.com/evanw/esbuild/pkg/api"
)

// using the ESbuild API, compiles a TypeScript or JavaScript
// file to a single bundle with all dependencies included,
// and returns the path to the outputted file
func BundleJavaScript(entry, appName, nodeVersion, destDir string) (string, error) {
	outputFile := path.Join(destDir, "bundled.js")

	os.Remove(outputFile)

	buildOpts := api.BuildOptions{
		Bundle:      true,
		EntryPoints: []string{entry},
		Outfile:     outputFile,
		Platform:    api.PlatformNode,
		Target:      api.ES2022,
		Write:       true,
	}

	buildResult := api.Build(buildOpts)

	errMsg := ""
	for _, e := range buildResult.Errors {
		errMsg = fmt.Sprintf(" %s", e.Text)
	}
	errMsg = strings.TrimSpace(errMsg)

	if len(errMsg) > 0 {
		return "", fmt.Errorf(errMsg)
	}

	compressedFilePath := fmt.Sprintf("%s.gz", outputFile)

	return CompressFile(outputFile, compressedFilePath)
}

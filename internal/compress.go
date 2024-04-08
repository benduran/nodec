package internal

import (
	"compress/gzip"
	"io"
	"os"
	"path"
)

// compresses a given input file with gzip compression.
// if successful, returns its output file path
func CompressFile(inputFilePath, outputFilePath string) string {
	originalNode, err := os.Open(inputFilePath)

	if err != nil {
		panic(err)
	}

	defer originalNode.Close()

	outputCompressedFilePath := path.Join(outputFilePath)

	gzipFile, err := os.Create(outputCompressedFilePath)

	if err != nil {
		panic(err)
	}

	defer gzipFile.Close()

	gzipWriter := gzip.NewWriter(gzipFile)
	defer gzipWriter.Close()

	_, err = io.Copy(gzipWriter, originalNode)

	if err != nil {
		panic(err)
	}

	err = gzipWriter.Flush()

	if err != nil {
		panic(err)
	}

	return outputFilePath
}

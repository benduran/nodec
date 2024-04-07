package internal

import (
	"os"
)

// Gets the CWD to where this application is running
func GetCWD() string {
	pwd, err := os.Getwd()

	if err != nil {
		panic(err)
	}

	return pwd
}

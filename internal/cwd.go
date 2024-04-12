package internal

import (
	"os"
)

// Gets the CWD to where this application is running
func GetCWD() (string, error) {
	pwd, err := os.Getwd()

	if err != nil {
		return "", err
	}

	return pwd, nil
}

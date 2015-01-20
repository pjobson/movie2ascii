# movie2ascii

Generates HTML pages to play ascii movies .. yeah .. I got really bored. The original goal of this project was to convert Too Many Cooks to an ASCII video for a buddy's birthday present, yes I know this can be done in VLC, but that's already been done.

This should work under Linux or OSX, I have no idea if it will run under CYGWIN or not.  

Movie plays well in Firefox, Chrome, and Safari.  I haven't tested it in IE, because I don't really care.

## Requrirements

### jp2a v1.0.6
The awesome Christian Stigen Larsen created this cool program to convert JPG files to ASCII, without it I probably would never have been able to make this mess.

https://csl.name/jp2a/

### ffmpeg v2.5
If you've done any video processing you've probably used ffmpeg.  I use it here to strip a series of JPG files and an MP3 from the original movie.

### node.js v0.10.33
My node-fu is pretty poor, I have a feeling that there is a better way to do some of this, but I don't care much.

## Install

### Prerequisites

jp2a and ffmpeg

Ubuntu/Mint/Debian
```
sudo apt-get jp2a ffmpeg nodejs
```
Redhat/Fedora/Centos
```
sudo yum install jp2a ffmpeg nodejs
```
OSX

Install Homebrew - http://brew.sh/
```
brew install jp2a ffmpeg nodejs
```

### movie2ascii

Clone my repo somewhwere.

Install node modules.

```
npm install
```

## Usage

```
Usage:
	node movie2ascii.node.js --movie name_of_movie.ext

Configuration Options:
	--help
	  (optional)
		Shows this page.
	--movie whatever_movie.ext
		Name of your movie file.
		To see what your install of ffmpeg supports use: ffmpeg -formats
	--path /path/to/output/to/
	  (optional)
		Name of path to build to, creates path based on movie file name by default.
	--watermark "Some Text"
	  (optional)
		Watermarks the bottom of the image.
	--font name_of_font
	  (optional)
		Watermarks the bottom of the image.

ASCII Options:
	--border
	  (optional)
		Use to add a border to the ASCII.
	--flipx
	  (optional)
		Flip X Axis.
	--flipy
	  (optional)
		Flip Y Axis.
	--width
	  (optional)
		Number of characters in width, scales height automagically.

Capability Options:
These do no video processing, even if you include other options. They may help to determine issues.
	--fontlist
	  (optional)
		Lists available fonts.
	--formats
	  (optional)
		Lists available video formats.
	--codecs
	  (optional)
		Lists available video codecs.

```


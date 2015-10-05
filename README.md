# movie2ascii

Generates HTML pages to play ascii movies .. yeah .. I got really bored. The original goal of this project was to
convert Too Many Cooks to an ASCII video for a buddy's birthday present, yes I know this can be done in VLC, but
that's already been done.

This should work under Linux or OSX, I have no idea if it will run under CYGWIN or not.

I basically take a movie which ffmpeg can read, convert it to a series of JPG files and an MP3.  The JPG files are
then converted to ASCII text files using jp2a.  While this is going on some frame rate data is read and the frames
are counted.  I then use an HTML template and create a project.  After it is all done the script stands up an HTTP
server on port 8989 for review.

On the HTML side I'm prefetching all of the frames using jQuery.ajax and serving them based on the FPS.  I also watch
the timeupdate event from MediaElement.js and re-synchrononize the current frame to the MP3 time to prevent it from
becoming offset, which tended to happen with videos over 5 minutes long with my original version.  As the MP3 plays
each text frame is grabbed and updated into a PRE tag.

Movie plays well in Firefox, Chrome, and Safari.  I haven't tested it in IE, because I don't have a virutal machine
with Windows on it handy.

## Example

http://pjobson.github.io/movie2ascii

## Requrirements

### jp2a v1.0.6
The awesome Christian Stigen Larsen created this cool program to convert JPG files to ASCII, without it I probably would
never have been able to make this mess.

https://csl.name/jp2a/

### ffmpeg v2.5
If you've done any video processing you've probably used ffmpeg.  I use it here to strip a series of JPG files and an MP3 from
the original movie.

### node.js v0.10.33
My node-fu is pretty poor, I have a feeling that there is a better way to do some of this, but I don't care much.

## Install

### Prerequisites

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
	--browserpreview
	  (optional)
		Automatically stands up server and opens browser when done.
	--movie whatever_movie.ext
		Name of your movie file.
		To see what your install of ffmpeg supports use: ffmpeg -formats
	--movieURL https://www.youtube.com/watch?v=SOME_VIDEO_ID
	  (optional)
		URL of video, use this instead of --movie.
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

### ascii2movie

This doesn't work yet, perhaps I will make it work one day.

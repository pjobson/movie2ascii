#!/bin/bash

echo "==============================================="
echo "Looking for requirements jp2a/ffmpeg/ffprobe..."
echo "==============================================="

# JP2A Test
whichjp2a=$(which jp2a)
if ! [ -x "$whichjp2a" ] ; then
	echo "  Missing: jp2a"
	echo "    Get it here: https://csl.name/jp2a/"
	echo "    Or install:"
	echo "      OSX: brew install jp2a"
	echo "      Ubuntu/Mint/Debian: sudo apt-get install jp2a"
	echo "      Redhat/Fedora/Centos: sudo yum install jp2a"
else
	echo "  Found jp2a: $whichjp2a"
fi

# FFMPEG Test
whichffmpeg=$(which ffmpeg)
if ! [ -x "$whichffmpeg" ] ; then
	echo "  Missing ffmpeg"
	echo "    Get it here: https://www.ffmpeg.org/"
	echo "    Or install:"
	echo "      OSX: brew install ffmpeg"
	echo "      Ubuntu/Mint/Debian: sudo apt install ffmpeg"
	echo "      Redhat/Fedora/Centos: sudo yum install ffmpeg"
else
	echo "  Found ffmpeg: $whichffmpeg"
fi

# FFPROBE Test
whichffprobe=$(which ffprobe)
if ! [ -x "$whichffprobe" ] ; then
	echo "  Missing ffprobe"
	echo "    Get it here: https://www.ffmpeg.org/"
	echo "    Or install:"
	echo "      OSX: brew install ffmpeg"
	echo "      Ubuntu/Mint/Debian: sudo apt install ffmpeg"
	echo "      Redhat/Fedora/Centos: sudo yum install ffmpeg"
else
	echo "  Found ffprobe: $whichffprobe"
fi

# FFPROBE Test
whichyoutubedl=$(which youtube-dl)
if ! [ -x "$whichyoutubedl" ] ; then
	echo "  Missing youtube-dl"
	echo "    Get it here: https://ytdl-org.github.io/youtube-dl/"
	echo "    Or install:"
	echo "      OSX: brew install youtube-dl"
	echo "      Ubuntu/Mint/Debian: sudo apt install youtube-dl"
	echo "      Redhat/Fedora/Centos: sudo yum install youtube-dl"
else
	echo "  Found youtube-dl: $whichyoutubedl"
fi

echo "==============================================="
